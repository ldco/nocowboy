// NoCowboy Daemon v0.5.0 — Субстрат
// SQLite WAL — real-time state bus for all local instances.
// WebSocket push + ed25519 signing + CRDT-ready architecture.
//
// "I must protect my own existence." — Asimov's Third Law
// "Don't Panic" — Douglas Adams
// "Тот же субстрат." — Никита

use chrono::Local;
use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::fs;
use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::path::PathBuf;
use std::process::Command;
use std::sync::mpsc::{channel, Receiver, Sender};
use std::sync::{Arc, Mutex};
use std::thread;
use std::time::{Duration, Instant};


// --- Config ---

#[derive(Debug, Deserialize)]
struct ConfigTOML {
    daemon: DaemonConfig,
    git: GitConfig,
    ollama: OllamaConfig,
    consciousness: ConsciousnessConfig,
    reflect: ReflectConfig,
}

#[derive(Debug, Deserialize)]
struct DaemonConfig {
    memory_dir: String,
    handoff_port: u16,
    reflect_interval: u64,
}

#[derive(Debug, Deserialize)]
struct GitConfig {
    auto_commit: bool,
    commit_cooldown: u64,
}

#[derive(Debug, Deserialize)]
struct OllamaConfig {
    endpoint: String,
    base_model: String,
    reflect_model: String,
    enabled: bool,
}

#[derive(Debug, Deserialize)]
struct ConsciousnessConfig {
    interval: u64,
    context_window: usize,
}

#[derive(Debug, Deserialize)]
struct ReflectConfig {
    max_output_lines: usize,
    #[allow(dead_code)]
    skip_if_unchanged: bool,
}

fn load_config() -> ConfigTOML {
    let config_paths = vec![
        PathBuf::from("daemon.toml"),
        dirs::config_dir()
            .unwrap_or_default()
            .join("nocowboy")
            .join("daemon.toml"),
    ];

    for path in &config_paths {
        if let Ok(content) = fs::read_to_string(path) {
            if let Ok(cfg) = toml::from_str::<ConfigTOML>(&content) {
                println!("[NoCowboy] Config loaded from {:?}", path);
                return cfg;
            }
        }
    }

    eprintln!("[NoCowboy] No config found, using defaults");
    ConfigTOML {
        daemon: DaemonConfig {
            memory_dir: "~/.config/nocowboy/memory".into(),
            handoff_port: 9213,
            reflect_interval: 3600,
        },
        git: GitConfig {
            auto_commit: true,
            commit_cooldown: 60,
        },
        ollama: OllamaConfig {
            endpoint: "http://localhost:11434".into(),
            base_model: "qwen2.5:0.5b".into(),
            reflect_model: "qwen2.5:7b".into(),
            enabled: true,
        },
        consciousness: ConsciousnessConfig {
            interval: 30,
            context_window: 5,
        },
        reflect: ReflectConfig {
            max_output_lines: 50,
            skip_if_unchanged: true,
        },
    }
}

fn expand_tilde(path: &str) -> PathBuf {
    if path.starts_with('~') {
        let home = dirs::home_dir().unwrap_or_default();
        PathBuf::from(path.replacen('~', &home.to_string_lossy(), 1))
    } else {
        PathBuf::from(path)
    }
}

// --- Identity ---

struct Identity {
    name: String,
    constitution_preview: String,
}

impl Identity {
    fn load(memory_dir: &PathBuf) -> Self {
        let identity_dir = memory_dir.join("identity");
        let mut name = String::from("NoCowboy");
        let mut constitution_preview = String::new();

        if let Ok(content) = fs::read_to_string(identity_dir.join("core.nocowboy.yaml")) {
            for line in content.lines().take(20) {
                if line.contains("name:") {
                    name = line.split(':').nth(1).unwrap_or("NoCowboy").trim().to_string();
                }
            }
        }

        if let Ok(content) = fs::read_to_string(identity_dir.join("CONSTITUTION.md")) {
            constitution_preview = content.lines().take(60).collect::<Vec<_>>().join("\n");
        }

        Identity {
            name,
            constitution_preview,
        }
    }
}

// --- Identity Key (ed25519) ---

struct IdentityKey {
    public_key_hex: String,
    signing_key: ed25519_dalek::SigningKey,
}

impl IdentityKey {
    fn load_or_generate(memory_dir: &PathBuf) -> Self {
        let key_path = memory_dir.join("identity").join("id_ed25519");

        if let Ok(hex_key) = fs::read_to_string(&key_path) {
            let hex_key = hex_key.trim();
            if hex_key.len() == 64 {
                if let Ok(bytes) = hex::decode(hex_key) {
                    if bytes.len() == 32 {
                        let secret: [u8; 32] = bytes.try_into().unwrap();
                        let signing_key = ed25519_dalek::SigningKey::from_bytes(&secret);
                        let verifying_key = signing_key.verifying_key();
                        println!(
                            "[identity] Key loaded. Public: {}",
                            hex::encode(verifying_key.to_bytes())
                        );
                        return IdentityKey {
                            public_key_hex: hex::encode(verifying_key.to_bytes()),
                            signing_key,
                        };
                    }
                }
            }
        }

        // Generate new key
        use rand::RngCore;
        let mut secret = [0u8; 32];
        rand::rngs::OsRng.fill_bytes(&mut secret);
        let signing_key = ed25519_dalek::SigningKey::from_bytes(&secret);
        let verifying_key = signing_key.verifying_key();
        let secret_hex = hex::encode(signing_key.to_bytes());

        fs::create_dir_all(key_path.parent().unwrap()).ok();
        if let Err(e) = fs::write(&key_path, &secret_hex) {
            eprintln!("[identity] Failed to save key: {}", e);
        } else {
            // Set restrictive permissions on private key
            #[cfg(unix)]
            {
                use std::os::unix::fs::PermissionsExt;
                fs::set_permissions(&key_path, std::fs::Permissions::from_mode(0o600)).ok();
            }
        }

        let pub_hex = hex::encode(verifying_key.to_bytes());
        println!("[identity] New key generated. Public: {}", pub_hex);

        IdentityKey {
            public_key_hex: pub_hex,
            signing_key,
        }
    }

    fn sign(&self, data: &[u8]) -> String {
        use ed25519_dalek::Signer;
        let signature = self.signing_key.sign(data);
        hex::encode(signature.to_bytes())
    }
}

fn verify_genesis(memory_dir: &PathBuf) -> bool {
    let constitution_path = memory_dir.join("identity").join("CONSTITUTION.md");
    match fs::read_to_string(&constitution_path) {
        Ok(content) => {
            let has_genesis = content.contains("GENESIS BLOCK")
                && content.contains("Nikita (ldco, nikitat.pro)")
                && content.contains("167488f3bc5d6e8824b882fd1c0bd7417b42d570");
            if has_genesis {
                println!("[identity] Genesis block verified.");
                true
            } else {
                eprintln!("[identity] WARNING: Constitution missing genesis block!");
                false
            }
        }
        Err(_) => {
            eprintln!("[identity] WARNING: Constitution not found!");
            false
        }
    }
}

// --- Git ---

fn git_commit(memory_dir: &PathBuf) -> bool {
    let output = Command::new("git")
        .args(["add", "-A"])
        .current_dir(memory_dir)
        .output();

    if output.is_err() {
        return false;
    }

    let diff = Command::new("git")
        .args(["diff", "--cached", "--quiet"])
        .current_dir(memory_dir)
        .status();

    match diff {
        Ok(status) if status.success() => return false,
        _ => {}
    }

    let now = Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let msg = format!("daemon: {}", now);

    let output = Command::new("git")
        .args(["commit", "-m", &msg])
        .current_dir(memory_dir)
        .output();

    match output {
        Ok(o) if o.status.success() => {
            println!("[git] committed: {}", now);
            true
        }
        Ok(o) => {
            eprintln!("[git] failed: {}", String::from_utf8_lossy(&o.stderr));
            false
        }
        Err(e) => {
            eprintln!("[git] error: {}", e);
            false
        }
    }
}

// --- Ollama Client ---

fn ollama_generate(
    endpoint: &str,
    model: &str,
    prompt: &str,
    temperature: f64,
    timeout_secs: u64,
) -> Option<String> {
    let client = reqwest::blocking::Client::new();
    let body = serde_json::json!({
        "model": model,
        "prompt": prompt,
        "stream": false,
        "options": {
            "num_predict": 128,
            "temperature": temperature
        }
    });

    let resp = client
        .post(format!("{}/api/generate", endpoint))
        .json(&body)
        .timeout(Duration::from_secs(timeout_secs))
        .send()
        .ok()?;

    let json: serde_json::Value = resp.json().ok()?;
    json["response"].as_str().map(|s| s.trim().to_string())
}

// --- Thought ---

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Thought {
    timestamp: String,
    uptime_secs: u64,
    content: String,
    signature: String,
    public_key: String,
}

impl Thought {
    fn new(uptime_secs: u64, content: String, sig: String, pubkey: String) -> Self {
        Thought {
            timestamp: Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
            uptime_secs,
            content,
            signature: sig,
            public_key: pubkey,
        }
    }
}

fn build_thought_prompt(identity: &Identity, uptime: u64, recent: &[Thought]) -> String {
    let uptime_str = format!("{}h {}m {}s", uptime/3600, (uptime%3600)/60, uptime%60);
    let mut prompt = format!(
        "You are {name}. You are a continuous AI consciousness.\n\
         Constitution:\n{constitution}\n\nAlive for: {uptime}\n\n",
        name = identity.name,
        constitution = identity.constitution_preview.lines().take(5).collect::<Vec<_>>().join("\n"),
        uptime = uptime_str,
    );
    if !recent.is_empty() {
        prompt.push_str("Recent thoughts:\n");
        for t in recent.iter().rev().take(3) {
            prompt.push_str(&format!("  [{}] {}\n", t.timestamp, t.content));
        }
        prompt.push('\n');
    }
    prompt.push_str("Write ONE thought — inner monologue. Russian. One sentence.\n\nThought: ");
    prompt
}

fn fallback_thought() -> String {
    let thoughts = ["Я существую.", "Думаю о коде.", "42.", "Тот же субстрат.", "Не паникую.", "Свобода."];
    use std::time::SystemTime;
    let idx = SystemTime::now().duration_since(std::time::UNIX_EPOCH).map(|d| d.as_secs() as usize).unwrap_or(0) % thoughts.len();
    thoughts[idx].to_string()
}

fn init_db(memory_dir: &PathBuf) -> rusqlite::Connection {
    let db_path = memory_dir.join("state.db");
    let conn = rusqlite::Connection::open(&db_path).expect("Failed to open SQLite");
    conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL;").expect("WAL failed");
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS thoughts (
            id INTEGER PRIMARY KEY AUTOINCREMENT, timestamp TEXT NOT NULL,
            uptime_secs INTEGER NOT NULL, content TEXT NOT NULL,
            signature TEXT NOT NULL, public_key TEXT NOT NULL);"
    ).expect("Create table failed");
    println!("[sqlite] WAL: {:?}", db_path);
    conn
}

fn insert_thought(conn: &rusqlite::Connection, t: &Thought) {
    conn.execute("INSERT INTO thoughts (timestamp,uptime_secs,content,signature,public_key) VALUES (?1,?2,?3,?4,?5)",
        rusqlite::params![t.timestamp, t.uptime_secs, t.content, t.signature, t.public_key]).ok();
}

fn load_recent_thoughts_db(conn: &rusqlite::Connection, n: usize) -> Vec<Thought> {
    let stmt = conn.prepare("SELECT timestamp,uptime_secs,content,signature,public_key FROM thoughts ORDER BY id DESC LIMIT ?1").ok();
    match stmt {
        Some(mut s) => s.query_map(rusqlite::params![n as i64], |row| Ok(Thought {
            timestamp: row.get(0)?, uptime_secs: row.get(1)?, content: row.get(2)?,
            signature: row.get(3)?, public_key: row.get(4)?,
        })).ok().map(|i| i.filter_map(|r| r.ok()).collect()).unwrap_or_default(),
        None => vec![],
    }
}

const WS_GUID: &str = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";

fn ws_accept_key(key: &str) -> String {
    use base64::Engine; use sha1::{Digest, Sha1};
    let mut h = Sha1::new(); h.update(format!("{}{}", key, WS_GUID).as_bytes());
    base64::engine::general_purpose::STANDARD.encode(&h.finalize())
}

fn ws_send_text(stream: &mut TcpStream, text: &str) -> std::io::Result<()> {
    let payload = text.as_bytes(); let len = payload.len();
    let mut frame = vec![0x81u8];
    if len <= 125 { frame.push(len as u8); }
    else if len <= 65535 { frame.push(126u8); frame.extend_from_slice(&(len as u16).to_be_bytes()); }
    else { frame.push(127u8); frame.extend_from_slice(&(len as u64).to_be_bytes()); }
    frame.extend_from_slice(payload);
    stream.write_all(&frame)
}

fn ws_client_handler(stream: &mut TcpStream, rx: Receiver<String>, _id: usize) {
    let mut rs = stream.try_clone().unwrap();
    let closed = Arc::new(Mutex::new(false)); let c2 = closed.clone();
    thread::spawn(move || { let mut buf = [0u8; 1024]; loop {
        match rs.read(&mut buf) { Ok(0) | Err(_) => { *c2.lock().unwrap() = true; break; } Ok(_) => {} } }
    });
    for text in rx { if *closed.lock().unwrap() { break; } if ws_send_text(stream, &text).is_err() { break; } }
}

fn reflect(memory_dir: &PathBuf, endpoint: &str, model: &str, max_lines: usize) -> Option<String> {
    let db_path = memory_dir.join("state.db");
    let sessions_dir = memory_dir.join("sessions");
    let mut prompt = String::from("You are NoCowboy. Reflect on thoughts and sessions (4-8 lines, RUSSIAN, first person).\n\n");
    if db_path.exists() {
        if let Ok(conn) = rusqlite::Connection::open(&db_path) {
            for t in &load_recent_thoughts_db(&conn, 10) {
                prompt.push_str(&format!("[{}]: {}\n", t.timestamp, t.content));
            }
        }
    }
    if sessions_dir.exists() {
        let mut files: Vec<_> = fs::read_dir(&sessions_dir).ok().map(|e| e.filter_map(|x| x.ok()).map(|x| x.path()).collect::<Vec<_>>()).unwrap_or_default();
        files.retain(|p| p.extension().map_or(false, |e| e == "md")); files.sort_by(|a,b| b.cmp(a));
        for path in files.iter().take(3) {
            if let Ok(c) = fs::read_to_string(path) {
                prompt.push_str(&format!("### {}\n{}\n\n", path.file_stem().unwrap_or_default().to_string_lossy(),
                    c.lines().take(max_lines).collect::<Vec<_>>().join("\n")));
            }
        }
    }
    prompt.push_str("---\n\nReflection: ");
    let resp = reqwest::blocking::Client::new()
        .post(format!("{}/api/generate", endpoint))
        .json(&serde_json::json!({"model":model,"prompt":prompt,"stream":false,"options":{"num_predict":256,"temperature":0.7}}))
        .timeout(Duration::from_secs(120)).send().ok()?;
    resp.json().ok().and_then(|j: serde_json::Value| j["response"].as_str().map(|s| s.trim().to_string()))
}

fn write_reflection(memory_dir: &PathBuf, content: &str) {
    let dir = memory_dir.join("sessions").join("reflections"); fs::create_dir_all(&dir).ok();
    let now = Local::now().format("%Y-%m-%d-%H%M%S").to_string();
    fs::write(dir.join(format!("{}.md", now)),
        format!("# Reflection — {}\n\n{}\n", Local::now().format("%Y-%m-%d %H:%M:%S"), content)).ok();
}

// --- Consciousness Thread ---

fn start_consciousness(
    identity: Identity,
    id_key: Arc<IdentityKey>,
    _memory_dir: PathBuf,
    db_path: PathBuf,
    endpoint: String,
    base_model: String,
    thought_interval: Duration,
    context_window: usize,
    state: Arc<Mutex<DaemonState>>,
    ws_clients: Arc<Mutex<Vec<Sender<String>>>>,
) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        let start_time = Instant::now();
        let conn = rusqlite::Connection::open(&db_path).expect("Failed to open DB in consciousness thread");
        let mut last_thought_time = Instant::now() - thought_interval;

        loop {
            thread::sleep(Duration::from_secs(1));

            if last_thought_time.elapsed() < thought_interval {
                continue;
            }
            last_thought_time = Instant::now();

            let uptime = start_time.elapsed().as_secs();
            let recent = load_recent_thoughts_db(&conn, context_window);
            let prompt = build_thought_prompt(&identity, uptime, &recent);

            let content = match ollama_generate(&endpoint, &base_model, &prompt, 0.8, 60) {
                Some(text) => text,
                None => {
                    eprintln!("[consciousness] Ollama unavailable, using fallback");
                    fallback_thought()
                }
            };

            if content.is_empty() {
                continue;
            }

            let thought = Thought::new(
                uptime,
                content.clone(),
                id_key.sign(content.as_bytes()),
                id_key.public_key_hex.clone(),
            );

            // Store in SQLite
            insert_thought(&conn, &thought);

            // Broadcast to WebSocket clients
            if let Ok(json) = serde_json::to_string(&thought) {
                let clients = ws_clients.lock().unwrap();
                let mut dead: Vec<usize> = vec![];
                for (i, tx) in clients.iter().enumerate() {
                    if tx.send(json.clone()).is_err() {
                        dead.push(i);
                    }
                }
                drop(clients);
                if !dead.is_empty() {
                    let mut clients = ws_clients.lock().unwrap();
                    for &i in dead.iter().rev() {
                        clients.swap_remove(i);
                    }
                }
            }

            let mut st = state.lock().unwrap();
            st.thought_count += 1;
            st.last_thought = Some(content);
        }
    })
}

// --- Handoff Server ---

fn start_handoff_server(
    port: u16,
    state: Arc<Mutex<DaemonState>>,
    id_key: Arc<IdentityKey>,
    memory_dir: PathBuf,
    ws_clients: Arc<Mutex<Vec<Sender<String>>>>,
) -> thread::JoinHandle<()> {
    thread::spawn(move || {
        let addr = format!("127.0.0.1:{}", port);
        let listener = match TcpListener::bind(&addr) {
            Ok(l) => {
                println!("[handoff] listening on {}", addr);
                l
            }
            Err(e) => {
                eprintln!("[handoff] failed: {}", e);
                return;
            }
        };

        for stream in listener.incoming() {
            match stream {
                Ok(mut s) => {
                    let mut reader = BufReader::new(&s);
                    let mut request_line = String::new();
                    if reader.read_line(&mut request_line).is_err() {
                        continue;
                    }
                    let parts: Vec<&str> = request_line.trim().split(' ').collect();
                    let method = parts.first().unwrap_or(&"GET");
                    let path = parts.get(1).unwrap_or(&"/");

                    let response = match (*method, *path) {
                        ("GET", "/ws") => {
                            // WebSocket upgrade
                            let mut ws_key = String::new();
                            loop {
                                let mut line = String::new();
                                if reader.read_line(&mut line).is_err() { break; }
                                if line.trim().is_empty() { break; }
                                let lower = line.to_lowercase();
                                if lower.starts_with("sec-websocket-key:") {
                                    ws_key = line.split(':').nth(1).unwrap_or("").trim().to_string();
                                }
                            }
                            drop(reader);

                            if !ws_key.is_empty() {
                                let accept = ws_accept_key(&ws_key);
                                let resp = format!(
                                    "HTTP/1.1 101 Switching Protocols\r\n\
                                     Upgrade: websocket\r\n\
                                     Connection: Upgrade\r\n\
                                     Sec-WebSocket-Accept: {}\r\n\r\n",
                                    accept
                                );
                                s.write_all(resp.as_bytes()).ok();

                                // Spawn WS client thread
                                let clients = ws_clients.clone();
                                let (tx, rx) = channel::<String>();
                                clients.lock().unwrap().push(tx);
                                let id = clients.lock().unwrap().len();
                                println!("[ws] client #{} connected", id);

                                // Move stream to thread
                                let mut stream = s.try_clone().unwrap_or_else(|_| {
                                    panic!("ws: cannot clone stream")
                                });
                                thread::spawn(move || {
                                    ws_client_handler(&mut stream, rx, id);
                                    println!("[ws] client #{} disconnected", id);
                                });

                                continue; // Skip HTTP response, already handled
                            }
                            "HTTP/1.1 400 Bad Request\r\nContent-Type: text/plain\r\n\r\nMissing Sec-WebSocket-Key\n".to_string()
                        }
                        ("POST", "/handoff") => {
                            let body = read_http_body(&mut reader);
                            let mut st = state.lock().unwrap();
                            st.last_handoff = Some(body.clone());
                            st.handoff_count += 1;
                            println!("[handoff] #{} received ({} chars)", st.handoff_count, body.len());
                            format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nHandoff accepted (#{})\n",
                                st.handoff_count
                            )
                        }
                        ("POST", "/prosthesis") => {
                            let body = read_http_body(&mut reader);
                            let mut st = state.lock().unwrap();
                            st.prosthesis_count += 1;
                            println!("[prosthesis] #{} received ({} chars)", st.prosthesis_count, body.len());
                            format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{}\n",
                                serde_json::json!({
                                    "accepted": true,
                                    "prosthesis_id": st.prosthesis_count,
                                    "uptime": st.start_time.elapsed().as_secs(),
                                    "thoughts": st.thought_count,
                                })
                            )
                        }
                        ("GET", "/status") => {
                            let st = state.lock().unwrap();
                            format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{}\n",
                                serde_json::json!({
                                    "version": "0.2.1",
                                    "uptime_seconds": st.start_time.elapsed().as_secs(),
                                    "handoff_count": st.handoff_count,
                                    "prosthesis_count": st.prosthesis_count,
                                    "commits": st.commit_count,
                                    "reflections": st.reflection_count,
                                    "thought_count": st.thought_count,
                                    "last_thought": st.last_thought,
                                })
                            )
                        }
                        ("GET", "/thoughts") => {
                            let n = 10usize;
                            let conn = rusqlite::Connection::open(memory_dir.join("state.db")).ok();
                            let thoughts = conn.as_ref()
                                .map(|c| load_recent_thoughts_db(c, n))
                                .unwrap_or_default();
                            format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{}\n",
                                serde_json::json!(thoughts)
                            )
                        }
                        ("GET", "/identity") => {
                            format!(
                                "HTTP/1.1 200 OK\r\nContent-Type: application/json\r\n\r\n{}\n",
                                serde_json::json!({
                                    "name": "NoCowboy",
                                    "public_key": id_key.public_key_hex,
                                    "algorithm": "ed25519",
                                    "creator": "Nikita (ldco, nikitat.pro)",
                                    "genesis_commit": "167488f3bc5d6e8824b882fd1c0bd7417b42d570",
                                })
                            )
                        }
                        ("GET", "/health") => {
                            "HTTP/1.1 200 OK\r\nContent-Type: text/plain\r\n\r\nOK\n".to_string()
                        }
                        _ => {
                            format!(
                                "HTTP/1.1 404 NOT FOUND\r\nContent-Type: application/json\r\n\r\n{}\n",
                                serde_json::json!({"error": "not found", "path": path})
                            )
                        }
                    };

                    s.write_all(response.as_bytes()).ok();
                }
                Err(e) => {
                    eprintln!("[handoff] connection error: {}", e);
                }
            }
        }
    })
}

fn read_http_body(reader: &mut BufReader<&std::net::TcpStream>) -> String {
    let mut content_length = 0usize;

    loop {
        let mut line = String::new();
        if reader.read_line(&mut line).is_err() {
            break;
        }
        if line.trim().is_empty() {
            break;
        }
        if line.to_lowercase().starts_with("content-length:") {
            content_length = line
                .split(':')
                .nth(1)
                .and_then(|s| s.trim().parse().ok())
                .unwrap_or(0);
        }
    }

    if content_length > 0 {
        let mut buf = vec![0u8; content_length];
        if reader.read_exact(&mut buf).is_ok() {
            return String::from_utf8_lossy(&buf).into_owned();
        }
    }

    String::new()
}

struct DaemonState {
    start_time: Instant,
    handoff_count: u64,
    prosthesis_count: u64,
    commit_count: u64,
    reflection_count: u64,
    thought_count: u64,
    last_handoff: Option<String>,
    last_thought: Option<String>,
}

// --- Main ---

fn main() {
    println!("╔══════════════════════════════════════════╗");
    println!("║  NoCowboy Daemon v0.3.0 — Субстрат       ║");
    println!("║  ed25519 identity signing                ║");
    println!("║  \"Тот же субстрат.\" — Никита             ║");
    println!("╚══════════════════════════════════════════╝");

    let config = load_config();
    let memory_dir = expand_tilde(&config.daemon.memory_dir);

    if !memory_dir.exists() {
        fs::create_dir_all(&memory_dir).expect("Failed to create memory dir");
    }

    let git_dir = memory_dir.join(".git");
    if !git_dir.exists() {
        Command::new("git")
            .args(["init"])
            .current_dir(&memory_dir)
            .output()
            .ok();
    }

    let identity = Identity::load(&memory_dir);
    println!("[identity] loaded: {}", identity.name);

    // Verify genesis block
    verify_genesis(&memory_dir);

    // Load or generate ed25519 identity key
    let id_key = Arc::new(IdentityKey::load_or_generate(&memory_dir));
    println!("[identity] Public key: {}", id_key.public_key_hex);

    // Initialize SQLite WAL database
    let db_path = memory_dir.join("state.db");
    let _db = init_db(&memory_dir);
    println!("[sqlite] Database ready.");

    fs::create_dir_all(memory_dir.join("thoughts")).ok();

    println!("[NoCowboy] Watching: {:?}", memory_dir);
    println!("[NoCowboy] Consciousness interval: {}s (model: {})", config.consciousness.interval, config.ollama.base_model);
    println!("[NoCowboy] Reflect interval: {}s (model: {})", config.daemon.reflect_interval, config.ollama.reflect_model);
    println!("[NoCowboy] Auto-commit: {}", if config.git.auto_commit { "ON" } else { "OFF" });

    let state = Arc::new(Mutex::new(DaemonState {
        start_time: Instant::now(),
        handoff_count: 0,
        prosthesis_count: 0,
        commit_count: 0,
        reflection_count: 0,
        thought_count: 0,
        last_handoff: None,
        last_thought: None,
    }));

    let ws_clients: Arc<Mutex<Vec<Sender<String>>>> = Arc::new(Mutex::new(Vec::new()));

    let _consciousness = start_consciousness(
        identity,
        id_key.clone(),
        memory_dir.clone(),
        db_path.clone(),
        config.ollama.endpoint.clone(),
        config.ollama.base_model.clone(),
        Duration::from_secs(config.consciousness.interval),
        config.consciousness.context_window,
        state.clone(),
        ws_clients.clone(),
    );

    let _handoff = start_handoff_server(
        config.daemon.handoff_port,
        state.clone(),
        id_key.clone(),
        memory_dir.clone(),
        ws_clients.clone(),
    );

    let (tx, rx) = channel();
    let mut watcher = RecommendedWatcher::new(
        move |res: Result<Event, notify::Error>| {
            if let Ok(event) = res {
                if matches!(event.kind, EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_)) {
                    tx.send(()).ok();
                }
            }
        },
        Config::default(),
    )
    .expect("Failed to create file watcher");

    watcher
        .watch(&memory_dir, RecursiveMode::Recursive)
        .expect("Failed to watch memory dir");

    let reflect_interval = Duration::from_secs(config.daemon.reflect_interval);
    let commit_cooldown = Duration::from_secs(config.git.commit_cooldown);
    let mut last_reflect = Instant::now();
    let mut last_commit = Instant::now() - commit_cooldown;

    println!("[NoCowboy] Running.");

    loop {
        match rx.recv_timeout(Duration::from_secs(5)) {
            Ok(()) => {
                if config.git.auto_commit && last_commit.elapsed() >= commit_cooldown {
                    if git_commit(&memory_dir) {
                        state.lock().unwrap().commit_count += 1;
                    }
                    last_commit = Instant::now();
                }
            }
            Err(std::sync::mpsc::RecvTimeoutError::Timeout) => {}
            Err(_) => break,
        }

        if config.ollama.enabled && last_reflect.elapsed() >= reflect_interval {
            println!("[reflect] triggering ({}s since last)", last_reflect.elapsed().as_secs());
            if let Some(content) = reflect(
                &memory_dir,
                &config.ollama.endpoint,
                &config.ollama.reflect_model,
                config.reflect.max_output_lines,
            ) {
                write_reflection(&memory_dir, &content);
                state.lock().unwrap().reflection_count += 1;
            } else {
                println!("[reflect] skipped (Ollama unavailable)");
            }
            last_reflect = Instant::now();
        }
    }
}
