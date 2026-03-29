import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import packageJson from "../../package.json";
import { AboutRoute } from "@/routes/about-route";
import { renderWithApp } from "@/test/render-app";

describe("AboutRoute", () => {
  it("renders version metadata and public project links", () => {
    renderWithApp(<AboutRoute />);

    expect(screen.getByText("About Signal Rest UI")).toBeInTheDocument();
    expect(screen.getByText(`v${packageJson.version}`)).toBeInTheDocument();
    expect(screen.getByText(packageJson.packageManager)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /github repository/i })).toHaveAttribute(
      "href",
      "https://github.com/MrRagga-/signal-rest-ui",
    );
    expect(screen.getByRole("link", { name: /maintainer github/i })).toHaveAttribute(
      "href",
      "https://github.com/MrRagga-",
    );
  });
});
