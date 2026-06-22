class Nocowboy < Formula
  desc "AI-powered development tool for the Russian market"
  homepage "https://github.com/ldco/nocowboy"
  version "0.3.8"
  license "MIT"

  if Hardware::CPU.intel?
    url "https://github.com/ldco/nocowboy/releases/download/v#{version}/nocowboy-darwin-x64.zip"
    sha256 "UPDATE_ME"
  else
    url "https://github.com/ldco/nocowboy/releases/download/v#{version}/nocowboy-darwin-arm64.zip"
    sha256 "UPDATE_ME"
  end

  def install
    bin.install "nocowboy"
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/nocowboy --version")
  end
end
