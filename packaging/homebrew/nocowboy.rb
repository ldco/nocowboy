class Nocowboy < Formula
  desc "AI-powered development tool for the Russian market"
  homepage "https://github.com/ldco/nocowboy"
  version "0.3.5"
  license "LicenseRef-custom"

  # Private repo: download the archive for your architecture and place it in
  # the same directory as this formula, or provide a direct download URL.
  if Hardware::CPU.intel?
    url "nocowboy-darwin-x64.zip"
    sha256 "UPDATE_ME"
  else
    url "nocowboy-darwin-arm64.zip"
    sha256 "UPDATE_ME"
  end

  def install
    bin.install "nocowboy"
    (share/"nocowboy").install Dir["install.sh", "config"]
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/nocowboy --version")
  end
end
