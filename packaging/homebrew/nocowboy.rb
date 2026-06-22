class Nocowboy < Formula
  desc "AI-powered development tool for the Russian market"
  homepage "https://github.com/ldco/nocowboy"
  version "0.3.5"
  license "LicenseRef-custom"

  # Set to the URL where release archives are hosted
  release_url = "https://releases.nocowboy.dev/v#{version}"

  if Hardware::CPU.intel?
    url "#{release_url}/nocowboy-darwin-x64.zip"
    sha256 "UPDATE_ME"
  else
    url "#{release_url}/nocowboy-darwin-arm64.zip"
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
