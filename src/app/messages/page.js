"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabaseClient";
import {
  ensureProfileForUser,
  fullNameFromProfile,
  loadProfiles,
  userLabel,
} from "@/lib/profileHelpers";

function pairFilter(uidA, uidB) {
  return `and(sender_id.eq.${uidA},recipient_id.eq.${uidB}),and(sender_id.eq.${uidB},recipient_id.eq.${uidA})`;
}

async function fetchMessagesForUser(userId) {
  return supabase
    .from("messages")
    .select("*")
    .or(`sender_id.eq.${userId},recipient_id.eq.${userId}`)
    .order("created_at", { ascending: true });
}

export default function MessagesPage() {
  const { user, loading } = useAuth();
  const [requestedUserId, setRequestedUserId] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      setRequestedUserId(params.get("u") || "");
    }
  }, []);


  const [profiles, setProfiles] = useState([]);
  const [messages, setMessages] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeUserId, setActiveUserId] = useState(requestedUserId);
  const [mode, setMode] = useState(requestedUserId ? "thread" : "list");
  const [searchText, setSearchText] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    Promise.all([ensureProfileForUser(user), loadProfiles(), fetchMessagesForUser(user.id)]).then(
      ([ensureRes, profilesRes, messagesRes]) => {
        if (cancelled) return;
        if (ensureRes.error) console.error(ensureRes.error);
        if (profilesRes.error) {
          console.error(profilesRes.error);
          setMessage(profilesRes.error.message);
        } else {
          setProfiles((profilesRes.data ?? []).filter((profile) => profile.id !== user.id));
        }
        if (messagesRes.error) {
          console.error(messagesRes.error);
          setMessage(messagesRes.error.message);
        } else {
          setMessages(messagesRes.data ?? []);
        }
        setIsLoaded(true);
      }
    );
    return () => { cancelled = true; };
  }, [user]);

  async function refreshData() {
    if (!user) return;
    setRefreshing(true);
    setMessage("");
    try {
      const [profilesRes, messagesRes] = await Promise.all([
        loadProfiles(),
        fetchMessagesForUser(user.id),
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (messagesRes.error) throw messagesRes.error;
      setProfiles((profilesRes.data ?? []).filter((profile) => profile.id !== user.id));
      setMessages(messagesRes.data ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to refresh messages.");
    } finally {
      setRefreshing(false);
    }
  }

  const profilesById = Object.fromEntries(profiles.map((profile) => [profile.id, profile]));

  function otherUserIdForMessage(row) {
    if (!user) return "";
    return row.sender_id === user.id ? row.recipient_id : row.sender_id;
  }

  const conversationMap = new Map();
  if (user) {
    for (const row of messages) {
      const otherUserId = otherUserIdForMessage(row);
      if (!otherUserId) continue;
      const previous = conversationMap.get(otherUserId);
      if (!previous || new Date(row.created_at).getTime() > new Date(previous.last.created_at).getTime()) {
        conversationMap.set(otherUserId, { otherUserId, last: row });
      }
    }
  }

  const conversations = Array.from(conversationMap.values()).sort(
    (a, b) => new Date(b.last.created_at).getTime() - new Date(a.last.created_at).getTime()
  );

  const activeThreadUserId =
    activeUserId && user && activeUserId !== user.id ? activeUserId : "";

  const activeThreadMessages =
    user && activeThreadUserId
      ? messages.filter((row) => {
        const pairA = row.sender_id === user.id && row.recipient_id === activeThreadUserId;
        const pairB = row.sender_id === activeThreadUserId && row.recipient_id === user.id;
        return pairA || pairB;
      })
      : [];

  const searchQuery = searchText.trim().toLowerCase();

  function labelForUserId(userId) {
    return userLabel(profilesById[userId], "", userId);
  }

  function secondaryForUserId(userId) {
    const profile = profilesById[userId];
    return fullNameFromProfile(profile) || profile?.email || userId;
  }

  const visibleConversations = searchQuery
    ? conversations.filter((conversation) => {
      const primary = labelForUserId(conversation.otherUserId).toLowerCase();
      const secondary = secondaryForUserId(conversation.otherUserId).toLowerCase();
      const preview = String(conversation.last.body ?? "").toLowerCase();
      return primary.includes(searchQuery) || secondary.includes(searchQuery) || preview.includes(searchQuery);
    })
    : conversations;

  const conversationUserIds = new Set(conversations.map((c) => c.otherUserId));
  const visibleNewUsers = searchQuery
    ? profiles.filter((profile) => {
      if (conversationUserIds.has(profile.id)) return false;
      const primary = userLabel(profile, "", profile.id).toLowerCase();
      const secondary = fullNameFromProfile(profile).toLowerCase();
      const email = String(profile.email ?? "").toLowerCase();
      return primary.includes(searchQuery) || secondary.includes(searchQuery) || email.includes(searchQuery);
    })
    : [];

  function openThread(targetUserId) {
    if (!user || !targetUserId || targetUserId === user.id) return;
    setActiveUserId(targetUserId);
    setMode("thread");
    setMessage("");
  }

  async function sendMessage(event) {
    event.preventDefault();
    if (!user || !activeThreadUserId) return;
    const trimmed = text.trim();
    if (!trimmed) return;
    setSending(true);
    setMessage("");
    try {
      const { error } = await supabase.from("messages").insert({
        sender_id: user.id,
        recipient_id: activeThreadUserId,
        body: trimmed,
      });
      if (error) throw error;
      setText("");
      await refreshData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to send message.");
    } finally {
      setSending(false);
    }
  }

  async function deleteConversation() {
    if (!user || !activeThreadUserId) return;
    const ok = window.confirm(`Delete conversation with ${labelForUserId(activeThreadUserId)}?`);
    if (!ok) return;
    setDeleting(true);
    setMessage("");
    try {
      const { error } = await supabase
        .from("messages")
        .delete()
        .or(pairFilter(user.id, activeThreadUserId));
      if (error) throw error;
      setMode("list");
      setActiveUserId("");
      await refreshData();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to delete conversation.");
    } finally {
      setDeleting(false);
    }
  }

  const inThread = mode === "thread" && !!activeThreadUserId;

  return (
    <div>
      <Header />
      <div className="container">

        {!inThread ? (
          <section className="pageHead">
            <div>
              <h1 className="pageTitle">Messages</h1>
              <p className="pageSubtitle">Connect with other students.</p>
            </div>
            {user ? (
              <button type="button" className="btn btnGhost" onClick={() => void refreshData()} disabled={refreshing}>
                {refreshing ? "Refreshing..." : "Refresh"}
              </button>
            ) : null}
          </section>
        ) : null}

        {loading ? (
          <div className="centerNotice">Loading messages...</div>
        ) : !user ? (
          <div className="centerNotice">
            Please <Link href="/login">log in</Link> to view messages.
          </div>
        ) : !isLoaded ? (
          <div className="centerNotice">Loading conversations...</div>
        ) : inThread ? (
          <section className="threadCard">
            <div className="threadHeader">
              <div>
                <h2 className="threadHeaderName">{labelForUserId(activeThreadUserId)}</h2>
                <p className="chatPreview threadHeaderSub">
                  {secondaryForUserId(activeThreadUserId)}
                </p>
              </div>
              <div className="actions threadActionsRow">
                <button type="button" className="btn btnGhost" onClick={() => setMode("list")}>
                  Back
                </button>
                <button type="button" className="btn btnDanger" onClick={deleteConversation} disabled={deleting}>
                  {deleting ? "Deleting..." : "Delete"}
                </button>

              </div>
            </div>

            <div className="threadMessages">
              {activeThreadMessages.length === 0 ? (
                <div className="centerNotice">No messages yet.</div>
              ) : (
                activeThreadMessages.map((row) => {
                  const mine = row.sender_id === user.id;
                  return (
                    <div key={row.id} className={`bubbleWrap ${mine ? "bubbleWrapMine" : ""}`}>
                      <div className={`bubble ${mine ? "bubbleMine" : "bubbleOther"}`}>
                        {row.body}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form className="composer" onSubmit={sendMessage}>
              <input
                placeholder="Type a message"
                value={text}
                onChange={(e) => setText(e.target.value)}
                disabled={sending || deleting}
                required
              />
              <button type="submit" className="btn btnPrimary" disabled={sending || deleting}>
                {sending ? "Sending..." : "Send"}
              </button>
            </form>
          </section>
        ) : (
          <section className="chatList">
            {requestedUserId && requestedUserId !== user.id && !profilesById[requestedUserId] ? (
              <div className="centerNotice chatUserNotFound">
                User not found yet. Refresh after they complete signup/profile setup.
              </div>
            ) : null}

            <div className="field">
              <input
                placeholder="Search conversations or students"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
            </div>

            {visibleConversations.length === 0 && visibleNewUsers.length === 0 ? (
              searchQuery ? (
                <div className="centerNotice">No conversations or students found.</div>
              ) : (
                <div className="centerNotice">
                  No messages yet. Use search to start a conversation.
                </div>
              )
            ) : (
              <>
                {visibleConversations.map((conversation) => (
                  <button
                    key={conversation.otherUserId}
                    type="button"
                    className={`chatRow ${activeUserId === conversation.otherUserId ? "chatRowActive" : ""}`}
                    onClick={() => openThread(conversation.otherUserId)}
                  >
                    <div className="chatTop">
                      <p className="chatName">{labelForUserId(conversation.otherUserId)}</p>
                    </div>
                    <p className="chatPreview">{conversation.last.body}</p>
                  </button>
                ))}

                {visibleNewUsers.length > 0 ? (
                  <>
                    <p className="label chatStartLabel">Start a conversation</p>
                    {visibleNewUsers.map((profile) => (
                      <button
                        key={profile.id}
                        type="button"
                        className="chatRow"
                        onClick={() => openThread(profile.id)}
                      >
                        <div className="chatTop">
                          <p className="chatName">{userLabel(profile, "", profile.id)}</p>
                        </div>
                        <p className="chatPreview">
                          {fullNameFromProfile(profile) || profile.email || profile.id}
                        </p>
                      </button>
                    ))}
                  </>
                ) : null}
              </>
            )}
          </section>
        )}

        {message ? (
          <p className={`messageText ${message.toLowerCase().includes("failed") ? "errorText" : ""}`}>
            {message}
          </p>
        ) : null}
      </div>
    </div>
  );
}
