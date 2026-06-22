class Nocowboy < Formula
  desc "AI-powered development tool for the Russian market"
  homepage "https://github.com/ldco/nocowboy"
  version "0.3.10"
  license "LicenseRef-custom"

  if Hardware::CPU.intel?
    url "https://example.com/releases/v#{version}/nocowboy-darwin-x64.zip"
    sha256 "UPDATE_ME"
  else
    url "https://example.com/releases/v#{version}/nocowboy-darwin-arm64.zip"
    sha256 "UPDATE_ME"
  end

  def install
    bin.install "nocowboy"
    (share/"nocowboy").install Dir["install.sh", "framework"]
  end

  def post_install
    ohai "To complete setup, run:"
    ohai "  #{share}/nocowboy/install.sh"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/nocowboy --version")
  end
end
