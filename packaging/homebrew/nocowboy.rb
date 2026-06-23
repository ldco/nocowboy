class Nocowboy < Formula
  desc "AI-powered development tool for the Russian market"
  homepage "https://github.com/ldco/nocowboy"
  version "0.5.5"
  license "LicenseRef-custom"

  release_url = "https://github.com/ldco/nocowboy/raw/master/releases"

  url "#{release_url}/nocowboy-darwin-arm64.zip"
  sha256 "UPDATE_ME"
  depends_on arch: :arm64

  def install
    bin.install "nocowboy"
    (share/"nocowboy").install Dir["install.sh", "config"]
  end

  test do
    assert_match version.to_s, shell_output("#{bin}/nocowboy --version")
  end
end
