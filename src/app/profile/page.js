"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import { sanitizeFileName, validateImageFile } from "@/lib/fileHelpers";
import { ensureProfileForUser, fullNameFromProfile } from "@/lib/profileHelpers";

async function uploadProfileImage(userId, file) {
  const path = `${userId}/${Date.now()}-${sanitizeFileName(file.name)}`;
  const { error } = await supabase.storage.from("profile-images").upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from("profile-images").getPublicUrl(path);
  return { profile_photo_url: data.publicUrl, profile_photo_path: path };
}

async function deleteProfileImage(path) {
  if (!path) return;
  await supabase.storage.from("profile-images").remove([path]);
}

const SIDEBAR_LINKS = [
  { href: "/profile", label: "Account Main" },
  { href: "/payment-methods", label: "Payment Methods" },
  { href: "/my-items", label: "My Listed Items" },
  { href: "/my-rentals", label: "My Rentals" },
];

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [message, setMessage] = useState("");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [bio, setBio] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [address1, setAddress1] = useState("");
  const [address2, setAddress2] = useState("");
  const [email, setEmail] = useState("");
  const [photoURL, setPhotoURL] = useState("");
  const [photoPath, setPhotoPath] = useState("");
  const [newPhotoFile, setNewPhotoFile] = useState(null);
  const [activeRentals, setActiveRentals] = useState([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    ensureProfileForUser(user).then(({ data, error }) => {
      if (cancelled) return;
      if (error) { setMessage(error.message); setLoaded(true); return; }
      setFirstName(data?.first_name ?? "");
      setLastName(data?.last_name ?? "");
      setBio(data?.bio ?? "");
      setPhoneNumber(data?.phone_number ?? "");
      setEmail(data?.email ?? user.email ?? "");
      setPhotoURL(data?.profile_photo_url ?? "");
      setPhotoPath(data?.profile_photo_path ?? "");
      setLoaded(true);
    });
    supabase.from("rental_transactions").select("id, status, expected_return_date, item_id")
      .eq("renter_id", user.id).eq("status", "active").limit(3)
      .then(({ data }) => { if (!cancelled) setActiveRentals(data ?? []); });
    return () => { cancelled = true; };
  }, [user]);

  async function saveProfile(event) {
    event.preventDefault();
    if (!user) return;
    if (!firstName.trim() || !lastName.trim()) { setMessage("First and last name required."); return; }
    const imgErr = validateImageFile(newPhotoFile);
    if (imgErr) { setMessage(imgErr); return; }
    setSaving(true); setMessage("");
    try {
      let nextPhotoURL = photoURL, nextPhotoPath = photoPath;
      const prevPath = photoPath;
      if (newPhotoFile) {
        const up = await uploadProfileImage(user.id, newPhotoFile);
        nextPhotoURL = up.profile_photo_url;
        nextPhotoPath = up.profile_photo_path;
      }
      const { data, error } = await supabase.from("profiles")
        .upsert({ id: user.id, email: user.email ?? "", first_name: firstName.trim(),
          last_name: lastName.trim(), bio: bio.trim(), phone_number: phoneNumber.trim(),
          profile_photo_url: nextPhotoURL, profile_photo_path: nextPhotoPath,
          updated_at: new Date().toISOString() }, { onConflict: "id" })
        .select().single();
      if (error) throw error;
      if (newPhotoFile && prevPath && prevPath !== nextPhotoPath) {
        try { await deleteProfileImage(prevPath); } catch {}
      }
      await supabase.auth.updateUser({ data: { first_name: firstName.trim(), last_name: lastName.trim(), full_name: `${firstName} ${lastName}`.trim() } });
      setPhotoURL(data.profile_photo_url ?? ""); setPhotoPath(data.profile_photo_path ?? "");
      setNewPhotoFile(null); setMessage("Profile updated.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Failed to update."); }
    finally { setSaving(false); }
  }

  async function logout() {
    setLoggingOut(true);
    const { error } = await supabase.auth.signOut();
    if (error) { setMessage(error.message); setLoggingOut(false); return; }
    router.push("/login");
  }

  const displayName = `${firstName} ${lastName}`.trim() || "Your Profile";

  if (loading || (user && !loaded)) {
    return <div><Header /><div className="container"><div className="centerNotice containerPt24">Loading...</div></div></div>;
  }
  if (!user) {
    return <div><Header /><div className="container"><div className="centerNotice containerPt24">Please <Link href="/login">log in</Link>.</div></div></div>;
  }

  return (
    <div>
      <Header />
      <div className="accountLayout">
        {/* Sidebar */}
        <aside className="accountSidebar">
          <div className="sidebarUser">
            {photoURL ? (
              <img src={photoURL} alt="Profile" className="sidebarAvatar sidebarAvatarImg" />
            ) : (
              <div className="sidebarAvatar">{(displayName[0] || "U").toUpperCase()}</div>
            )}
            <p className="sidebarName">{displayName}</p>
            <p className="sidebarEmail">{user.email}</p>
          </div>

          <ul className="sidebarNav">
            {SIDEBAR_LINKS.map(({ href, label }) => (
              <li key={href} className={`sidebarNavItem${pathname === href ? " active" : ""}`}>
                <Link href={href}>{label}</Link>
              </li>
            ))}
          </ul>

          {activeRentals.length > 0 && (
            <div className="sidebarRentalsSection">
              <p className="sidebarRentalsTitle">Current Rentals</p>
              {activeRentals.map((r) => (
                <Link key={r.id} href={`/rentals/${r.id}`} className="sidebarRentalLink">
                  <p className="sidebarRentalId">#{r.id}</p>
                  <p className="sidebarRentalDue">
                    Due: {new Date(r.expected_return_date).toLocaleDateString()}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </aside>

        {/* Main content */}
        <div className="accountContent">
          <h1 className="pageTitle profilePageTitle">Account Main</h1>

          <div className="profileShell profileShellNarrow">
            {/* Photo card */}
            <div className="profileCard">
              {photoURL ? (
                <img src={photoURL} alt="Profile" className="profilePhoto" />
              ) : (
                <div className="profilePhoto profilePhotoPlaceholder">{(displayName[0] || "U").toUpperCase()}</div>
              )}
              <p className="profileName">{displayName}</p>
              <p className="profileEmail">{user.email}</p>
            </div>

            {/* Edit form */}
            <form className="formCard" onSubmit={saveProfile}>
              <h2 className="profileFormTitle">Personal Information</h2>

              <div className="profileFormGrid">
                <div className="field">
                  <label className="label">First Name</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
                </div>
                <div className="field">
                  <label className="label">Last Name</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} required />
                </div>
              </div>

              <div className="field">
                <label className="label">Email Address</label>
                <input value={user.email || email} disabled className="readonlyField" />
              </div>

              <div className="field">
                <label className="label">Phone Number</label>
                <input value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} placeholder="780 000 0000" />
              </div>

              <div className="field">
                <label className="label">Address Line 1</label>
                <input value={address1} onChange={(e) => setAddress1(e.target.value)} placeholder="123 ST, 34 Ave NW Callingwood" />
              </div>

              <div className="field">
                <label className="label">Address Line 2</label>
                <input value={address2} onChange={(e) => setAddress2(e.target.value)} placeholder="230, 21 Ave SW" />
              </div>

              <div className="field">
                <label className="label">Profile Photo (max 5MB)</label>
                <input type="file" accept="image/*" onChange={(e) => setNewPhotoFile(e.target.files?.[0] ?? null)} />
              </div>

              <div className="actions">
                <button type="submit" className="btn btnPrimary" disabled={saving}>
                  {saving ? "Saving..." : "Edit Profile"}
                </button>
                <button type="button" className="btn btnGhost" onClick={logout} disabled={loggingOut}>
                  {loggingOut ? "Logging out..." : "Logout"}
                </button>
              </div>

              {message && (
                <p className={`messageText ${message.toLowerCase().includes("fail") ? "errorText" : "successText"}`}>
                  {message}
                </p>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
