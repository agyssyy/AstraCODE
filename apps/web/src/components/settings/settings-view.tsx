"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Database,
  Download,
  KeyRound,
  Laptop,
  LoaderCircle,
  MailCheck,
  MonitorSmartphone,
  Moon,
  ShieldCheck,
  Sun,
  Trash2,
  UserRound,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Field,
  Input,
  Select,
  Switch,
  cn,
} from "@astracode/ui";
import { toast } from "sonner";
import type { ModelDto, PublicUser, SessionInfo, UserSettingsDto } from "@astracode/shared";
import { api, apiBase, errorMessage } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useTheme } from "@/components/theme-provider";
import { ConfirmDialog } from "@/components/ui-extras/confirm-dialog";
import { formatDateTime, initials, timeAgo } from "@/lib/format";
import { PageHeader } from "@/components/ui-extras/page-header";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "id", label: "Bahasa Indonesia" },
  { value: "es", label: "Español" },
  { value: "de", label: "Deutsch" },
  { value: "fr", label: "Français" },
  { value: "ja", label: "日本語" },
  { value: "pt", label: "Português" },
  { value: "zh", label: "中文" },
];

const SECTIONS = [
  { id: "profile", label: "Profile", icon: UserRound },
  { id: "preferences", label: "Preferences", icon: Laptop },
  { id: "security", label: "Security", icon: KeyRound },
  { id: "data", label: "Data & privacy", icon: Database },
];

export function SettingsView() {
  const router = useRouter();
  const { setTheme } = useTheme();
  const {
    data: meData,
    refetch: refetchMe,
    setData: setMeData,
  } = useApi<{ user: PublicUser; settings: UserSettingsDto }>("/auth/me");
  const { data: modelsData } = useApi<{ models: ModelDto[] }>("/models");
  const {
    data: sessionsData,
    refetch: refetchSessions,
    setData: setSessionsData,
  } = useApi<{ sessions: SessionInfo[] }>("/auth/sessions");

  const user = meData?.user;
  const models = modelsData?.models ?? [];
  const sessions = sessionsData?.sessions ?? [];

  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [profilePending, setProfilePending] = React.useState(false);

  const [prefs, setPrefs] = React.useState<UserSettingsDto | null>(null);
  const [prefsPending, setPrefsPending] = React.useState(false);

  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [passwordPending, setPasswordPending] = React.useState(false);

  const {
    data: twoFactor,
    refetch: refetchTwoFactor,
  } = useApi<{
    enabled: boolean;
    required: boolean;
    email: string | null;
    configured: boolean;
    systemMailer: boolean;
  }>("/auth/2fa");
  const [twoFactorEmail, setTwoFactorEmail] = React.useState("");
  const [twoFactorPassword, setTwoFactorPassword] = React.useState("");
  const [twoFactorAccountPassword, setTwoFactorAccountPassword] = React.useState("");
  const [twoFactorPending, setTwoFactorPending] = React.useState(false);
  const [twoFactorDisableOpen, setTwoFactorDisableOpen] = React.useState(false);
  const [twoFactorDisablePassword, setTwoFactorDisablePassword] = React.useState("");
  const [twoFactorDisablePending, setTwoFactorDisablePending] = React.useState(false);

  const [revokeTarget, setRevokeTarget] = React.useState<SessionInfo | null>(null);
  const [revoking, setRevoking] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [deletePassword, setDeletePassword] = React.useState("");
  const [deletePending, setDeletePending] = React.useState(false);
  const [activeSection, setActiveSection] = React.useState("profile");

  React.useEffect(() => {
    if (!meData) return;
    setName(meData.user.name);
    setEmail(meData.user.email);
    setPrefs(meData.settings);
  }, [meData]);

  const saveProfile = async () => {
    setProfilePending(true);
    try {
      const result = await api.patch<{ user: PublicUser }>("/settings/profile", {
        name: name.trim(),
        email: email.trim(),
      });
      setMeData((prev) => (prev ? { ...prev, user: { ...prev.user, ...result.user } } : prev));
      toast.success("Profile updated");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setProfilePending(false);
    }
  };

  const updatePref = <K extends keyof UserSettingsDto>(key: K, value: UserSettingsDto[K]) => {
    setPrefs((prev) => (prev ? { ...prev, [key]: value } : prev));
    if (key === "theme") setTheme(value as UserSettingsDto["theme"]);
  };

  const savePrefs = async () => {
    if (!prefs) return;
    setPrefsPending(true);
    try {
      await api.patch("/settings", {
        theme: prefs.theme,
        language: prefs.language,
        editorFontSize: prefs.editorFontSize,
        editorTabSize: prefs.editorTabSize,
        editorWordWrap: prefs.editorWordWrap,
        defaultModelId: prefs.defaultModelId,
      });
      toast.success("Preferences saved");
      refetchMe();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPrefsPending(false);
    }
  };

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match.");
      return;
    }
    setPasswordPending(true);
    try {
      await api.post("/settings/password", { currentPassword, newPassword });
      toast.success("Password changed", {
        description: "Other sessions have been signed out.",
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      refetchSessions();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setPasswordPending(false);
    }
  };

  const enableTwoFactor = async () => {
    setTwoFactorPending(true);
    try {
      await api.post("/auth/2fa/enable", {
        email: twoFactorEmail.trim(),
        password: twoFactorAccountPassword,
        appPassword: twoFactorPassword,
      });
      setTwoFactorPassword("");
      setTwoFactorAccountPassword("");
      refetchTwoFactor();
      toast.success("Two-step verification enabled", {
        description: "Future sign-ins will ask for a code sent to your Gmail.",
      });
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setTwoFactorPending(false);
    }
  };

  const disableTwoFactor = async () => {
    setTwoFactorDisablePending(true);
    try {
      await api.post("/auth/2fa/disable", { password: twoFactorDisablePassword });
      setTwoFactorDisablePassword("");
      setTwoFactorDisableOpen(false);
      refetchTwoFactor();
      toast.success("Two-step verification turned off");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setTwoFactorDisablePending(false);
    }
  };

  const revokeSession = async () => {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await api.delete(`/auth/sessions/${revokeTarget.id}`);
      setSessionsData((prev) =>
        prev ? { sessions: prev.sessions.filter((s) => s.id !== revokeTarget.id) } : prev,
      );
      toast.success("Session revoked");
      if (revokeTarget.current) {
        router.push("/login");
        router.refresh();
      }
      setRevokeTarget(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setRevoking(false);
    }
  };

  const deleteAccount = async () => {
    if (!deletePassword) return;
    setDeletePending(true);
    try {
      await api.delete("/settings/account", { password: deletePassword });
      toast.success("Account deleted");
      router.push("/");
      router.refresh();
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setDeletePending(false);
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Manage / Settings"
        title="Settings"
        description="Manage your profile, editor defaults and account security."
      />

      <div className="stagger-fade grid gap-5 lg:grid-cols-[170px_1fr]">
        <nav className="hidden lg:block">
          <ul className="sticky top-20 space-y-0.5 border-l border-[hsl(var(--border))]">
            {SECTIONS.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    "relative flex items-center gap-2 border-l-2 px-2.5 py-1.5 text-[12px] transition-all",
                    activeSection === section.id
                      ? "-ml-px border-[hsl(var(--signal))] bg-[hsl(var(--signal))]/8 font-medium text-[hsl(var(--foreground))]"
                      : "-ml-px border-transparent text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))] hover:text-[hsl(var(--foreground))]",
                  )}
                >
                  <section.icon className="size-3.5" /> {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="max-w-2xl space-y-4">
          <Card id="profile" className="scroll-mt-4">
            <CardHeader>
              <CardTitle>Profile</CardTitle>
              <CardDescription>How you appear inside AstraCode.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="flex size-12 items-center justify-center border border-[hsl(var(--border))] bg-[hsl(var(--signal))]/10 font-mono text-[15px] font-semibold text-[hsl(var(--signal))]">
                  {user ? initials(user.name) : "…"}
                </span>
                <div>
                  <p className="text-[13px] font-medium">{user?.name ?? "Loading…"}</p>
                  <p className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
                    Member since {user ? formatDateTime(user.createdAt) : "—"}
                  </p>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <Input value={name} onChange={(event) => setName(event.target.value)} />
                </Field>
                <Field label="Email">
                  <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button
                  onClick={() => void saveProfile()}
                  disabled={profilePending || !user || !name.trim() || !email.trim()}
                >
                  {profilePending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                  Save profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card id="preferences" className="scroll-mt-4">
            <CardHeader>
              <CardTitle>Preferences</CardTitle>
              <CardDescription>Theme, language and Studio editor defaults.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="mb-1.5 text-[12px] font-medium">Theme</p>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: "light", label: "Light", icon: Sun },
                    { value: "dark", label: "Dark", icon: Moon },
                    { value: "system", label: "System", icon: Laptop },
                  ].map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => updatePref("theme", option.value as UserSettingsDto["theme"])}
                      className={cn(
                        "relative flex flex-col items-center gap-1.5 border px-3 py-3 text-[11.5px] transition-all duration-200",
                        prefs?.theme === option.value
                          ? "border-[hsl(var(--signal))] bg-[hsl(var(--signal))]/8 text-[hsl(var(--foreground))]"
                          : "border-[hsl(var(--border))] text-[hsl(var(--muted-foreground))] hover:-translate-y-px hover:border-[hsl(var(--foreground))]/30 hover:bg-[hsl(var(--muted))]/40",
                      )}
                    >
                      {prefs?.theme === option.value ? (
                        <Check className="absolute right-2 top-2 size-3 text-[hsl(var(--signal))]" />
                      ) : null}
                      <option.icon className="size-4" />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="AI response language" hint="Astra replies in this language">
                  <Select
                    value={prefs?.language ?? "en"}
                    onChange={(event) => updatePref("language", event.target.value)}
                  >
                    {LANGUAGES.map((language) => (
                      <option key={language.value} value={language.value}>
                        {language.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Default model">
                  <Select
                    value={prefs?.defaultModelId ?? ""}
                    onChange={(event) => updatePref("defaultModelId", event.target.value || null)}
                  >
                    <option value="">No default</option>
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.label} · {model.providerName}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Editor font size" hint="10–24 px">
                  <Input
                    type="number"
                    min={10}
                    max={24}
                    value={prefs?.editorFontSize ?? 13}
                    onChange={(event) =>
                      updatePref("editorFontSize", Number(event.target.value) || 13)
                    }
                  />
                </Field>
                <Field label="Tab size">
                  <Select
                    value={String(prefs?.editorTabSize ?? 2)}
                    onChange={(event) => updatePref("editorTabSize", Number(event.target.value))}
                  >
                    <option value="2">2 spaces</option>
                    <option value="4">4 spaces</option>
                    <option value="8">8 spaces</option>
                  </Select>
                </Field>
              </div>

              <label className="flex items-center justify-between rounded-lg border border-[hsl(var(--border))] px-3 py-2.5">
                <span>
                  <span className="block text-[12.5px] font-medium">Word wrap in editor</span>
                  <span className="block text-[11px] text-[hsl(var(--muted-foreground))]">
                    Wrap long lines instead of scrolling horizontally.
                  </span>
                </span>
                <Switch
                  checked={prefs?.editorWordWrap ?? true}
                  onCheckedChange={(checked) => updatePref("editorWordWrap", checked)}
                />
              </label>

              <div className="flex justify-end">
                <Button onClick={() => void savePrefs()} disabled={!prefs || prefsPending}>
                  {prefsPending ? <LoaderCircle className="size-3.5 animate-spin" /> : null}
                  Save preferences
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card id="security" className="scroll-mt-4">
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>
                Change your password and review active sessions. Changing the password signs out other
                devices.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-3">
                <Field label="Current password">
                  <Input
                    type="password"
                    value={currentPassword}
                    onChange={(event) => setCurrentPassword(event.target.value)}
                    autoComplete="current-password"
                  />
                </Field>
                <Field label="New password" hint="10+ characters">
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="Confirm new password">
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    autoComplete="new-password"
                  />
                </Field>
              </div>
              <div className="flex justify-end">
                <Button
                  variant="secondary"
                  onClick={() => void changePassword()}
                  disabled={!currentPassword || newPassword.length < 10 || passwordPending}
                >
                  {passwordPending ? <LoaderCircle className="size-3.5 animate-spin" /> : <ShieldCheck className="size-3.5" />}
                  Update password
                </Button>
              </div>

              <div className="border-t border-[hsl(var(--border))] pt-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-[12px] font-medium">
                      <MailCheck className="size-3.5 text-[hsl(var(--signal))]" />
                      Two-step verification
                    </p>
                    <p className="mt-1 text-[11.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                      {twoFactor?.required
                        ? `A 6-digit code is emailed to ${twoFactor.email ?? "your email"} before every sign-in. This is always on.`
                        : twoFactor?.enabled
                          ? `A 6-digit code is emailed to ${twoFactor.email ?? "your email"} after each password check.`
                          : "Require a 6-digit code sent to your email every time you sign in."}
                    </p>
                  </div>
                  <Badge variant={twoFactor?.required || twoFactor?.enabled ? "success" : "secondary"}>
                    {twoFactor?.required ? "Always on" : twoFactor?.enabled ? "Enabled" : "Off"}
                  </Badge>
                </div>

                {twoFactor?.required ? (
                  <div className="mt-3 rounded-lg border border-[hsl(var(--border))] px-3 py-2">
                    <p className="text-[11px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                      Every account must confirm a 6-digit email code before a session starts.
                      Codes are sent by AstraCode.
                    </p>
                  </div>
                ) : twoFactor?.enabled ? (
                  <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-[hsl(var(--border))] px-3 py-2">
                    <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                      Codes are sent from your own Gmail account.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-[10.5px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                      onClick={() => setTwoFactorDisableOpen(true)}
                    >
                      Turn off
                    </Button>
                  </div>
                ) : (
                  <div className="mt-3 space-y-3">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label={twoFactor?.systemMailer ? "Email address" : "Gmail address"}>
                        <Input
                          type="email"
                          autoComplete="email"
                          placeholder={twoFactor?.systemMailer ? "you@example.com" : "you@gmail.com"}
                          value={twoFactorEmail}
                          onChange={(event) => setTwoFactorEmail(event.target.value)}
                        />
                      </Field>
                      {!twoFactor?.systemMailer ? (
                        <Field label="Gmail app password">
                          <Input
                            type="password"
                            autoComplete="off"
                            placeholder="16-character app password"
                            value={twoFactorPassword}
                            onChange={(event) => setTwoFactorPassword(event.target.value)}
                          />
                        </Field>
                      ) : null}
                      <Field label="Your AstraCode password">
                        <Input
                          type="password"
                          autoComplete="current-password"
                          placeholder="Confirm it's you"
                          value={twoFactorAccountPassword}
                          onChange={(event) => setTwoFactorAccountPassword(event.target.value)}
                        />
                      </Field>
                    </div>
                    <p className="text-[10.5px] leading-relaxed text-[hsl(var(--muted-foreground))]">
                      {twoFactor?.systemMailer ? (
                        "Codes are sent by the workspace's AstraCode email sender. You only need to confirm the address."
                      ) : (
                        <>
                          Create an app password at{" "}
                          <a
                            href="https://myaccount.google.com/apppasswords"
                            target="_blank"
                            rel="noreferrer"
                            className="font-medium text-[hsl(var(--primary))] hover:underline"
                          >
                            myaccount.google.com/apppasswords
                          </a>{" "}
                          and paste it here. Use an app password, never your normal Google
                          password.
                        </>
                      )}
                    </p>
                    <div className="flex justify-end">
                      <Button
                        variant="secondary"
                        onClick={() => void enableTwoFactor()}
                        disabled={
                          twoFactorPending ||
                          !twoFactorEmail.trim() ||
                          !twoFactorAccountPassword ||
                          (!twoFactor?.systemMailer &&
                            twoFactorPassword.replace(/\s+/g, "").length < 8)
                        }
                      >
                        {twoFactorPending ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="size-3.5" />
                        )}
                        Enable 2-step
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <p className="mb-2 text-[12px] font-medium">Active sessions</p>
                <ul className="space-y-1.5">
                  {sessions.map((session) => (
                    <li
                      key={session.id}
                      className="flex items-center gap-2.5 rounded-lg border border-[hsl(var(--border))] px-3 py-2"
                    >
                      <MonitorSmartphone className="size-4 shrink-0 text-[hsl(var(--muted-foreground))]" />
                      <div className="min-w-0 flex-1">
                        <p className="flex items-center gap-1.5 truncate text-[11.5px] font-medium">
                          {shortAgent(session.userAgent)}
                          {session.current ? <Badge variant="success">This device</Badge> : null}
                        </p>
                        <p className="truncate text-[10.5px] text-[hsl(var(--muted-foreground))]">
                          {session.ip ?? "unknown IP"} · active {timeAgo(session.lastUsedAt)}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 shrink-0 px-2 text-[10.5px] text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--destructive))]"
                        onClick={() => setRevokeTarget(session)}
                      >
                        {session.current ? "Sign out" : "Revoke"}
                      </Button>
                    </li>
                  ))}
                  {sessions.length === 0 ? (
                    <p className="text-[11.5px] text-[hsl(var(--muted-foreground))]">No active sessions.</p>
                  ) : null}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card id="data" className="scroll-mt-4">
            <CardHeader>
              <CardTitle>Data & privacy</CardTitle>
              <CardDescription>
                Your data lives in this deployment. Provider keys are encrypted with AES-256-GCM and
                are never returned by the API.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-2 rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-3 py-2.5">
                <Check className="mt-0.5 size-3.5 shrink-0 text-[hsl(var(--success))]" />
                <p className="text-[11.5px] text-[hsl(var(--muted-foreground))]">
                  No analytics or telemetry is collected by this build. Prompts are only sent to the AI
                  provider you configure.
                </p>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  variant="secondary"
                  onClick={() => window.open(`${apiBase()}/settings/export`, "_blank", "noopener")}
                >
                  <Download className="size-4" /> Export all data
                </Button>
                <Button variant="destructive" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="size-4" /> Delete account
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
        title={revokeTarget?.current ? "Sign out of this device?" : "Revoke session?"}
        description={
          revokeTarget?.current
            ? "You will be signed out and need to log in again."
            : "That device will need to log in again."
        }
        confirmLabel={revokeTarget?.current ? "Sign out" : "Revoke"}
        destructive
        pending={revoking}
        onConfirm={revokeSession}
      />

      <Dialog open={twoFactorDisableOpen} onOpenChange={setTwoFactorDisableOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Turn off two-step verification</DialogTitle>
            <DialogDescription>
              Future sign-ins will only ask for your password. Confirm with your password to
              continue.
            </DialogDescription>
          </DialogHeader>
          <Field label="Your password">
            <Input
              type="password"
              value={twoFactorDisablePassword}
              onChange={(event) => setTwoFactorDisablePassword(event.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setTwoFactorDisableOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void disableTwoFactor()}
              disabled={!twoFactorDisablePassword || twoFactorDisablePending}
            >
              {twoFactorDisablePending ? (
                <LoaderCircle className="size-3.5 animate-spin" />
              ) : (
                <ShieldCheck className="size-3.5" />
              )}
              Turn off
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription>
              This permanently deletes your profile, projects, conversations, models, benchmarks and
              provider keys. This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <Field label="Confirm with your password">
            <Input
              type="password"
              value={deletePassword}
              onChange={(event) => setDeletePassword(event.target.value)}
              autoComplete="current-password"
            />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void deleteAccount()}
              disabled={!deletePassword || deletePending}
            >
              {deletePending ? <LoaderCircle className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
              Delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function shortAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";
  if (/android/i.test(userAgent)) return "Android device";
  if (/iphone|ipad/i.test(userAgent)) return "iOS device";
  if (/macintosh|mac os/i.test(userAgent)) return "Mac";
  if (/windows/i.test(userAgent)) return "Windows PC";
  if (/linux/i.test(userAgent)) return "Linux";
  if (/curl/i.test(userAgent)) return "Command line";
  return userAgent.slice(0, 40);
}
