import {
  ExternalLink,
  GitBranch,
  LifeBuoy,
  Mail,
  Package,
  ShieldCheck,
} from "lucide-react";
import packageJson from "../../package.json";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const repositoryUrl = packageJson.repository.url.replace(/^git\+/, "").replace(/\.git$/, "");
const maintainerUrl = "https://github.com/MrRagga-";
const issueUrl = packageJson.bugs.url;
const securityUrl = `${repositoryUrl}/security`;
const dockerHubUrl = "https://hub.docker.com/r/mrragga/signal-rest-ui";

const resourceLinks = [
  {
    href: repositoryUrl,
    label: "GitHub repository",
    description: "Source, releases, changelog, and issue tracking.",
    icon: GitBranch,
  },
  {
    href: issueUrl,
    label: "Issues and feature requests",
    description: "Report bugs or propose workflow improvements.",
    icon: LifeBuoy,
  },
  {
    href: securityUrl,
    label: "Security policy",
    description: "Private vulnerability reporting guidance and supported versions.",
    icon: ShieldCheck,
  },
  {
    href: dockerHubUrl,
    label: "Docker Hub image",
    description: "Published container image mirrored on Docker Hub.",
    icon: Package,
  },
  {
    href: maintainerUrl,
    label: "Maintainer GitHub",
    description: "Primary public contact path for project maintenance.",
    icon: Mail,
  },
];

export function AboutRoute() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div>
            <CardTitle>About Signal Rest UI</CardTitle>
            <CardDescription>
              Focused operator UI for signal-cli-rest-api, built for direct LAN
              access and explicit proxy fallback when browser routing gets in the
              way.
            </CardDescription>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge>v{packageJson.version}</Badge>
            <Badge className="border-white/10 bg-white/[0.06] text-stone-200">
              {packageJson.license}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm leading-7 text-stone-300">
            This workspace keeps high-frequency Signal tasks close at hand without
            turning message receive into an always-on background process. Use this page
            for project metadata, source links, maintainer contact paths, and release
            registry references.
          </p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)]">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Links and contact</CardTitle>
              <CardDescription>
                Public support and maintenance channels for the project.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {resourceLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Button
                  key={link.href}
                  asChild
                  className="h-auto min-h-24 justify-between rounded-[1.3rem] px-4 py-4 text-left"
                  variant="secondary"
                >
                  <a href={link.href} rel="noreferrer" target="_blank">
                    <span className="min-w-0">
                      <span className="flex items-center gap-2 text-sm font-semibold text-stone-100">
                        <Icon className="size-4 shrink-0" />
                        {link.label}
                      </span>
                      <span className="mt-2 block text-sm font-normal leading-6 text-stone-400">
                        {link.description}
                      </span>
                    </span>
                    <ExternalLink className="size-4 shrink-0 text-stone-500" />
                  </a>
                </Button>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Version details</CardTitle>
              <CardDescription>
                Release metadata surfaced directly from the checked-in app manifest.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-stone-500">
                Application version
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-100">
                {packageJson.version}
              </p>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-stone-500">
                Package manager
              </p>
              <p className="mt-2 text-sm text-stone-300">{packageJson.packageManager}</p>
            </div>

            <div className="rounded-[1.4rem] border border-white/8 bg-black/20 p-4">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-stone-500">
                License
              </p>
              <p className="mt-2 text-sm text-stone-300">{packageJson.license}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
