#!/usr/bin/env python3
"""Headless pty driver for the NoCowboy TUI.

Spawns a command on a pseudo-terminal and answers the terminal capability
queries OpenTUI waits for (colors, cursor position, DECRQM, keyboard protocol,
pixel size), so the TUI renders without a real terminal. Raw output goes to
stdout; exits after --timeout seconds.

Used by test/cli/tui/tui-headless.test.ts so the render smoke tests can run in
CI. Requires only the standard library.
"""

import fcntl
import os
import pty
import re
import select
import signal
import struct
import sys
import termios
import time


def respond(data: bytes) -> bytes:
    """Reply to the terminal queries found in a chunk of TUI output."""
    out = bytearray()
    if b"\x1b]10;?" in data:
        out += b"\x1b]10;rgb:ffff/ffff/ffff\x07"
    if b"\x1b]11;?" in data:
        out += b"\x1b]11;rgb:0000/0000/0000\x07"
    for match in re.finditer(rb"\x1b\]4;(\d+);\?", data):
        out += b"\x1b]4;" + match.group(1) + b";rgb:ffff/ffff/ffff\x07"
    out += b"\x1b[1;1R" * data.count(b"\x1b[6n")
    for match in re.finditer(rb"\x1b\[\?(\d+)\$p", data):
        # state 2 = recognised but reset; keeps capabilities (mouse, bracketed
        # paste) off so the captured frame stays readable.
        out += b"\x1b[?" + match.group(1) + b";2$y"
    if b"\x1b[?u" in data:
        out += b"\x1b[?0u"
    if b"\x1b[14t" in data:
        out += b"\x1b[4;800;1200t"
    return bytes(out)


def main() -> int:
    args = sys.argv[1:]
    timeout = 10.0
    if args and args[0].startswith("--timeout="):
        timeout = float(args[0].split("=", 1)[1])
        args = args[1:]
    if not args:
        print("usage: pty-driver.py [--timeout=SECONDS] command [args...]", file=sys.stderr)
        return 2

    rows, cols = 45, 140
    pid, fd = pty.fork()
    if pid == 0:
        os.environ.setdefault("TERM", "xterm-256color")
        os.environ["COLUMNS"] = str(cols)
        os.environ["LINES"] = str(rows)
        try:
            os.execvp(args[0], args)
        finally:
            os._exit(127)

    fcntl.ioctl(fd, termios.TIOCSWINSZ, struct.pack("HHHH", rows, cols, 0, 0))

    buf = bytearray()
    deadline = time.time() + timeout
    while time.time() < deadline:
        ready, _, _ = select.select([fd], [], [], 0.1)
        if fd not in ready:
            continue
        try:
            data = os.read(fd, 65536)
        except OSError:
            break
        if not data:
            break
        buf += data
        replies = respond(data)
        if replies:
            try:
                os.write(fd, replies)
            except OSError:
                break

    for _ in range(2):
        try:
            os.write(fd, b"\x03")
        except OSError:
            break
        time.sleep(0.2)
    try:
        os.kill(pid, signal.SIGTERM)
    except ProcessLookupError:
        pass
    try:
        os.waitpid(pid, os.WNOHANG)
    except ChildProcessError:
        pass
    try:
        os.close(fd)
    except OSError:
        pass

    sys.stdout.buffer.write(bytes(buf))
    sys.stdout.buffer.flush()
    return 0


if __name__ == "__main__":
    sys.exit(main())
