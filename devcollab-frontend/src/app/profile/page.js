"use client";

import { useEffect, useState } from "react";
import { apiRequest } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import AppShell from "@/components/AppShell";
import Panel from "@/components/ui/Panel";
import Badge from "@/components/ui/Badge";

const emptyForm = {
  bio: "",
  skills: "",
  interests: "",
  availabilityHoursPerWeek: 10,
  preferredRoles: "",
  experienceLevel: "junior",
  githubUsername: "",
  portfolioLinks: "",
  timezone: ""
};

const listToText = (value = []) => value.join(", ");

const textToList = (value = "") =>
  value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

const linksToText = (links = []) =>
  links.map((link) => [link.label, link.url].filter(Boolean).join(" | ")).join("\n");

const textToLinks = (value = "") =>
  value
    .split("\n")
    .map((line) => {
      const [labelOrUrl, ...rest] = line.split("|").map((item) => item.trim());
      const url = rest.join(" | ").trim();

      if (!labelOrUrl && !url) {
        return null;
      }

      if (!url) {
        return {
          label: "",
          url: labelOrUrl
        };
      }

      return {
        label: labelOrUrl,
        url
      };
    })
    .filter(Boolean);

export default function ProfilePage() {
  const [form, setForm] = useState(emptyForm);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const loadProfile = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest("/developer-profile/me");
      const currentProfile = response.data.profile;

      setProfile(currentProfile);
      setForm({
        bio: currentProfile.bio || "",
        skills: listToText(currentProfile.skills),
        interests: listToText(currentProfile.interests),
        availabilityHoursPerWeek: currentProfile.availabilityHoursPerWeek ?? 10,
        preferredRoles: listToText(currentProfile.preferredRoles),
        experienceLevel: currentProfile.experienceLevel || "junior",
        githubUsername: currentProfile.githubUsername || "",
        portfolioLinks: linksToText(currentProfile.portfolioLinks),
        timezone: currentProfile.timezone || ""
      });
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    Promise.resolve().then(loadProfile);
  }, []);

  const handleChange = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const payload = {
        bio: form.bio,
        skills: textToList(form.skills),
        interests: textToList(form.interests),
        availabilityHoursPerWeek: Number(form.availabilityHoursPerWeek),
        preferredRoles: textToList(form.preferredRoles),
        experienceLevel: form.experienceLevel,
        githubUsername: form.githubUsername,
        portfolioLinks: textToLinks(form.portfolioLinks),
        timezone: form.timezone
      };

      const response = await apiRequest("/developer-profile/me", {
        method: "PUT",
        body: JSON.stringify(payload)
      });

      setProfile(response.data.profile);
      setMessage("Profile saved");
    } catch (error) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-slate-400">Loading profile...</p>
      </main>
    );
  }

  return (
    <AppShell
      title="Developer profile"
      description="Skills, interests, availability, role preferences, GitHub, and portfolio."
    >
      {error && (
        <p className="mb-6 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      {message && (
        <p className="mb-6 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-300">
          {message}
        </p>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Panel className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Bio</label>
              <textarea
                name="bio"
                value={form.bio}
                onChange={handleChange}
                rows={4}
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <TextAreaField label="Skills" name="skills" value={form.skills} onChange={handleChange} />
              <TextAreaField label="Interests" name="interests" value={form.interests} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Hours per week
                </label>
                <input
                  name="availabilityHoursPerWeek"
                  type="number"
                  min="0"
                  max="80"
                  value={form.availabilityHoursPerWeek}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Experience
                </label>
                <select
                  name="experienceLevel"
                  value={form.experienceLevel}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                >
                  <option value="beginner">Beginner</option>
                  <option value="junior">Junior</option>
                  <option value="mid">Mid</option>
                  <option value="senior">Senior</option>
                  <option value="lead">Lead</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Timezone</label>
                <input
                  name="timezone"
                  value={form.timezone}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Preferred roles
                </label>
                <input
                  name="preferredRoles"
                  value={form.preferredRoles}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  GitHub username
                </label>
                <input
                  name="githubUsername"
                  value={form.githubUsername}
                  onChange={handleChange}
                  className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Portfolio links
              </label>
              <textarea
                name="portfolioLinks"
                value={form.portfolioLinks}
                onChange={handleChange}
                rows={4}
                placeholder="Portfolio | https://example.com"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save profile"}
            </button>
          </form>
        </Panel>

        <Panel>
          <h2 className="text-xl font-bold">{profile?.user?.name}</h2>
          <p className="text-slate-400 mt-1">{profile?.user?.email}</p>

          <div className="mt-5 grid grid-cols-2 gap-3">
            <Summary label="Hours" value={`${profile?.availabilityHoursPerWeek ?? 0}/wk`} />
            <Summary label="Level" value={profile?.experienceLevel || "junior"} />
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-slate-300 mb-3">Skills</p>
            <TagList values={profile?.skills} variant="blue" />
          </div>

          <div className="mt-5">
            <p className="text-sm font-medium text-slate-300 mb-3">Interests</p>
            <TagList values={profile?.interests} />
          </div>
        </Panel>
      </div>

      <div className="mt-6">
        <SecurityPanel />
      </div>
    </AppShell>
  );
}

function TextAreaField({ label, name, value, onChange }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-2">{label}</label>
      <textarea
        name={name}
        value={value}
        onChange={onChange}
        rows={4}
        className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
      />
    </div>
  );
}

function Summary({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
      <p className="text-sm text-slate-400">{label}</p>
      <p className="font-semibold mt-1">{value}</p>
    </div>
  );
}

function TagList({ values = [], variant = "default" }) {
  if (!values.length) {
    return <p className="text-sm text-slate-500">None</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {values.map((value) => (
        <Badge key={value} variant={variant}>
          {value}
        </Badge>
      ))}
    </div>
  );
}

function SecurityPanel() {
  const { sendChangePasswordOTP, changePassword, resendOTP, user } = useAuth();
  
  const [step, setStep] = useState(1);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleRequestOTP = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    
    if (newPassword !== confirmPassword) {
      return setError("New passwords do not match.");
    }
    if (newPassword.length < 8) {
      return setError("Password must be at least 8 characters long.");
    }
    
    setLoading(true);
    try {
      await sendChangePasswordOTP({ currentPassword });
      setStep(2);
      setCountdown(60);
      setMessage("OTP sent to your email.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await changePassword({ currentPassword, newPassword, confirmPassword, otp });
      setStep(1);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setOtp("");
      setMessage("Password changed successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await resendOTP({ email: user?.email, purpose: "change_password" });
      setCountdown(60);
      setMessage("OTP resent successfully.");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Panel>
      <div>
        <h2 className="text-xl font-bold">Security</h2>
        <p className="text-sm text-slate-400 mt-1">Change your password.</p>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}
      
      {message && (
        <p className="mt-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-4 py-3 text-sm text-emerald-300">
          {message}
        </p>
      )}

      {step === 1 ? (
        <form onSubmit={handleRequestOTP} className="mt-6 space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
              required
              minLength={8}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500"
              required
              minLength={8}
            />
          </div>

          <button
            type="submit"
            disabled={loading || !currentPassword || !newPassword || !confirmPassword}
            className="rounded-xl bg-blue-600 px-5 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Requesting..." : "Change Password"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOTP} className="mt-6 space-y-4 max-w-md">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">6-Digit OTP</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="123456"
              className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 text-white outline-none focus:border-blue-500 text-center tracking-[0.5em] text-lg font-mono"
              required
              maxLength={6}
              minLength={6}
            />
          </div>

          <button
            type="submit"
            disabled={loading || otp.length < 6}
            className="w-full rounded-xl bg-blue-600 py-3 font-semibold hover:bg-blue-500 disabled:opacity-60"
          >
            {loading ? "Verifying..." : "Verify & Change Password"}
          </button>

          <div className="pt-2">
            <button
              type="button"
              onClick={handleResend}
              disabled={loading || countdown > 0}
              className="text-sm text-blue-400 hover:text-blue-300 disabled:text-slate-500 disabled:cursor-not-allowed transition-colors"
            >
              {countdown > 0 ? `Resend OTP in ${countdown}s` : "Resend OTP"}
            </button>
          </div>
        </form>
      )}
    </Panel>
  );
}
