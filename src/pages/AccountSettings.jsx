import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const SECTIONS = [
  { id: "profile", icon: "👤", label: "User Profile" },
  { id: "settings", icon: "⚙️", label: "Account Settings" },
  { id: "appearance", icon: "🎨", label: "Appearance" },
  { id: "security", icon: "🔒", label: "Security" },
  { id: "notifications", icon: "🔔", label: "Notifications" },
  { id: "help", icon: "❓", label: "Help & Support" },
];

export default function AccountSettings() {
  const { user, updateProfile, updatePassword, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const requestedTab = searchParams.get("tab") || "profile";
  const validTab = SECTIONS.some((item) => item.id === requestedTab)
    ? requestedTab
    : "profile";

  const [activeTab, setActiveTab] = useState(validTab);
  const [name, setName] = useState(user?.user_metadata?.full_name || "");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [darkTheme, setDarkTheme] = useState(
    () => localStorage.getItem("lendswift-theme") === "dark"
  );
  const [emailNotifications, setEmailNotifications] = useState(
    () => localStorage.getItem("lendswift-email-notifications") !== "off"
  );
  const [productUpdates, setProductUpdates] = useState(
    () => localStorage.getItem("lendswift-product-updates") === "on"
  );

  useEffect(() => {
    setActiveTab(validTab);
  }, [validTab]);

  useEffect(() => {
    document.documentElement.dataset.theme = darkTheme ? "dark" : "light";
    localStorage.setItem("lendswift-theme", darkTheme ? "dark" : "light");
  }, [darkTheme]);

  function openSection(id) {
    setActiveTab(id);
    setSearchParams({ tab: id });
    setMessage("");
    setError("");
  }

  async function handleProfile(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!name.trim()) {
      setError("Please enter your full name.");
      return;
    }

    setSaving(true);

    try {
      await updateProfile({ name: name.trim() });
      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(err.message || "Could not update profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handlePassword(e) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    setSaving(true);

    try {
      await updatePassword(password);
      setPassword("");
      setMessage("Password changed successfully.");
    } catch (err) {
      setError(err.message || "Could not change password.");
    } finally {
      setSaving(false);
    }
  }

  function saveNotifications() {
    localStorage.setItem(
      "lendswift-email-notifications",
      emailNotifications ? "on" : "off"
    );
    localStorage.setItem(
      "lendswift-product-updates",
      productUpdates ? "on" : "off"
    );
    setMessage("Notification preferences saved in this browser.");
    setError("");
  }

  async function handleLogout() {
    setError("");

    try {
      await signOut();
    } catch (err) {
      setError(err.message || "Could not log out.");
    }
  }

  const activeSection = SECTIONS.find((item) => item.id === activeTab);

  return (
    <main className="account-page">
      <div className="account-layout">
        <aside className="account-sidebar">
          <Link to="/application" className="account-brand">
            <span className="account-brand-icon">L</span>
            <span>
              <strong>LendSwift</strong>
              <small>ACCOUNT CENTER</small>
            </span>
          </Link>

          <p className="account-sidebar-label">YOUR ACCOUNT</p>

          <nav className="account-section-nav" aria-label="Account sections">
            {SECTIONS.map((section) => (
              <button
                key={section.id}
                type="button"
                className={
                  activeTab === section.id
                    ? "account-nav-item active"
                    : "account-nav-item"
                }
                onClick={() => openSection(section.id)}
                aria-current={activeTab === section.id ? "page" : undefined}
              >
                <span>{section.icon}</span>
                {section.label}
                <span className="account-nav-arrow">›</span>
              </button>
            ))}
          </nav>

          <div className="account-sidebar-bottom">
            <span className="account-avatar">
              {(name || user?.email || "U").charAt(0).toUpperCase()}
            </span>
            <div>
              <strong>{name || "My Account"}</strong>
              <small>{user?.email}</small>
            </div>
          </div>
        </aside>

        <section className="account-main">
          <header className="account-page-header">
            <div>
              <p className="account-breadcrumb">
                ACCOUNT CENTER / {activeSection?.label.toUpperCase()}
              </p>
              <h1>{activeSection?.label}</h1>
              <p>Manage your LendSwift account and preferences.</p>
            </div>

            <Link className="account-back-link" to="/application">
              ← Loan application
            </Link>
          </header>

          {error && <p className="account-alert error" role="alert">{error}</p>}
          {message && (
            <p className="account-alert success" role="status">{message}</p>
          )}

          {activeTab === "profile" && (
            <section className="account-card">
              <div className="account-card-heading">
                <span>👤</span>
                <div>
                  <h2>Personal profile</h2>
                  <p>Update the name associated with your account.</p>
                </div>
              </div>

              <form onSubmit={handleProfile} className="account-form">
                <label htmlFor="settings-name">Full name</label>
                <input
                  id="settings-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="name"
                  maxLength={100}
                  required
                />

                <label htmlFor="settings-email">Email address</label>
                <input
                  id="settings-email"
                  type="email"
                  value={user?.email || ""}
                  readOnly
                />
                <small className="account-hint">
                  Email is shown from your authenticated account.
                </small>

                <button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save profile"}
                </button>
              </form>
            </section>
          )}

          {activeTab === "settings" && (
            <section className="account-card">
              <div className="account-card-heading">
                <span>⚙️</span>
                <div>
                  <h2>Account preferences</h2>
                  <p>Review your account and application preferences.</p>
                </div>
              </div>

              <div className="account-setting-row">
                <div>
                  <strong>Account email</strong>
                  <p>{user?.email || "No email available"}</p>
                </div>
                <span className="account-status">Active session</span>
              </div>

              <div className="account-setting-row">
                <div>
                  <strong>Application drafts</strong>
                  <p>Drafts are currently stored locally by this demo.</p>
                </div>
                <span className="account-status">Local storage</span>
              </div>

              <p className="account-hint">
                This section displays current demo settings. It does not change
                your loan eligibility or submit an application.
              </p>
            </section>
          )}

          {activeTab === "appearance" && (
            <section className="account-card">
              <div className="account-card-heading">
                <span>🎨</span>
                <div>
                  <h2>Appearance</h2>
                  <p>Choose the look of the account center.</p>
                </div>
              </div>

              <div className="account-setting-row">
                <div>
                  <strong>Dark theme</strong>
                  <p>Use a darker background for this page.</p>
                </div>

                <label className="account-switch">
                  <input
                    type="checkbox"
                    checked={darkTheme}
                    onChange={(e) => setDarkTheme(e.target.checked)}
                    aria-label="Enable dark theme"
                  />
                  <span />
                </label>
              </div>

              <p className="account-hint">
                Your choice is saved in this browser. Applying it to the loan
                application page as well requires shared theme styling there.
              </p>
            </section>
          )}

          {activeTab === "security" && (
            <section className="account-card">
              <div className="account-card-heading">
                <span>🔒</span>
                <div>
                  <h2>Password and security</h2>
                  <p>Change the password for your authenticated account.</p>
                </div>
              </div>

              <form onSubmit={handlePassword} className="account-form">
                <label htmlFor="settings-password">New password</label>
                <input
                  id="settings-password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />

                <small className="account-hint">
                  Use at least 8 characters. Choose a password you do not use
                  on other websites.
                </small>

                <button type="submit" disabled={saving}>
                  {saving ? "Updating..." : "Change password"}
                </button>
              </form>

              <div className="account-setting-row">
                <div>
                  <strong>Authentication provider</strong>
                  <p>Supabase Auth</p>
                </div>
                <span className="account-status">Enabled</span>
              </div>
            </section>
          )}

          {activeTab === "notifications" && (
            <section className="account-card">
              <div className="account-card-heading">
                <span>🔔</span>
                <div>
                  <h2>Notifications</h2>
                  <p>Choose your local demo notification preferences.</p>
                </div>
              </div>

              <label className="account-setting-row">
                <div>
                  <strong>Email notifications</strong>
                  <p>Preference for account-related email updates.</p>
                </div>
                <input
                  type="checkbox"
                  checked={emailNotifications}
                  onChange={(e) => setEmailNotifications(e.target.checked)}
                />
              </label>

              <label className="account-setting-row">
                <div>
                  <strong>Product updates</strong>
                  <p>Preference for new feature announcements.</p>
                </div>
                <input
                  type="checkbox"
                  checked={productUpdates}
                  onChange={(e) => setProductUpdates(e.target.checked)}
                />
              </label>

              <p className="account-hint">
                These toggles save preferences in this browser only. They do
                not send or unsubscribe from real emails.
              </p>

              <button type="button" onClick={saveNotifications}>
                Save notification preferences
              </button>
            </section>
          )}

          {activeTab === "help" && (
            <section className="account-card">
              <div className="account-card-heading">
                <span>❓</span>
                <div>
                  <h2>Help & support</h2>
                  <p>Information about this project.</p>
                </div>
              </div>

              <div className="account-setting-row">
                <div>
                  <strong>About LendSwift</strong>
                  <p>
                    This is a demo loan application project. It does not
                    approve loans or contact a lender.
                  </p>
                </div>
              </div>

              <div className="account-setting-row">
                <div>
                  <strong>Need help with your application?</strong>
                  <p>
                    Return to the application to continue or review your
                    current demo flow.
                  </p>
                </div>
                <Link to="/application">Open application →</Link>
              </div>
            </section>
          )}

          <div className="account-footer">
            <button
              type="button"
              className="account-logout-button"
              onClick={handleLogout}
            >
              ↪ Log out
            </button>
            <span>Account security is handled by Supabase Auth.</span>
          </div>
        </section>
      </div>
    </main>
  );
}
