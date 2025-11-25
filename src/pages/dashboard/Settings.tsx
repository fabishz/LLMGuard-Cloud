import { DashboardLayout } from "@/components/dashboard/DashboardLayout";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Copy, Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function Settings() {
  const [showApiKey, setShowApiKey] = useState(false);
  const { toast } = useToast();

  const copyApiKey = () => {
    navigator.clipboard.writeText("sk_live_1234567890abcdef");
    toast({
      title: "Copied!",
      description: "API key copied to clipboard",
    });
  };

  return (
    <DashboardLayout>
      <div className="space-y-8 animate-fade-in max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold mb-2">Settings</h1>
          <p className="text-muted-foreground">Manage your account and project settings</p>
        </div>

        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="glass">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="project">Project</TabsTrigger>
            <TabsTrigger value="api">API Keys</TabsTrigger>
            <TabsTrigger value="models">Models</TabsTrigger>
            <TabsTrigger value="team">Team</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="space-y-6">
            <Card className="p-6 glass">
              <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" defaultValue="John Doe" className="glass" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue="john@company.com" className="glass" />
                </div>
                <Button>Save Changes</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="project" className="space-y-6">
            <Card className="p-6 glass">
              <h3 className="text-lg font-semibold mb-4">Project Settings</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">Project Name</Label>
                  <Input id="project-name" defaultValue="Production App" className="glass" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="project-id">Project ID</Label>
                  <Input id="project-id" defaultValue="proj_1234567890" disabled className="glass" />
                </div>
                <Button>Update Project</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="api" className="space-y-6">
            <Card className="p-6 glass">
              <h3 className="text-lg font-semibold mb-4">API Keys</h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Production API Key</Label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                      <Input
                        type={showApiKey ? "text" : "password"}
                        value="sk_live_1234567890abcdef"
                        readOnly
                        className="glass pr-10"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full"
                        onClick={() => setShowApiKey(!showApiKey)}
                      >
                        {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                    <Button variant="outline" onClick={copyApiKey}>
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <Button variant="destructive">Regenerate Key</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="models" className="space-y-6">
            <Card className="p-6 glass">
              <h3 className="text-lg font-semibold mb-4">Model Configuration</h3>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label>Default Model</Label>
                  <Input defaultValue="gpt-4" className="glass" />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Temperature</Label>
                    <span className="text-sm text-muted-foreground">0.7</span>
                  </div>
                  <Slider defaultValue={[0.7]} max={1} step={0.1} />
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Enable Safety Checks</Label>
                    <p className="text-sm text-muted-foreground">Automatically flag high-risk outputs</p>
                  </div>
                  <Switch defaultChecked />
                </div>
                <Button>Save Configuration</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="team" className="space-y-6">
            <Card className="p-6 glass">
              <h3 className="text-lg font-semibold mb-4">Team Members</h3>
              <div className="space-y-4">
                {[
                  { name: "John Doe", email: "john@company.com", role: "Owner" },
                  { name: "Jane Smith", email: "jane@company.com", role: "Admin" },
                  { name: "Bob Johnson", email: "bob@company.com", role: "Member" },
                ].map((member) => (
                  <div key={member.email} className="flex items-center justify-between p-4 rounded-lg border border-border/50">
                    <div>
                      <p className="font-medium">{member.name}</p>
                      <p className="text-sm text-muted-foreground">{member.email}</p>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">{member.role}</span>
                      <Button variant="ghost" size="sm">Remove</Button>
                    </div>
                  </div>
                ))}
                <Button>Invite Member</Button>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="danger" className="space-y-6">
            <Card className="p-6 glass border-destructive/50">
              <h3 className="text-lg font-semibold mb-4 text-destructive">Danger Zone</h3>
              <div className="space-y-4">
                <div className="p-4 rounded-lg border border-destructive/50">
                  <h4 className="font-medium mb-2">Delete Project</h4>
                  <p className="text-sm text-muted-foreground mb-4">
                    Once you delete a project, there is no going back. Please be certain.
                  </p>
                  <Button variant="destructive">Delete Project</Button>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
