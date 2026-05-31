// src/index.tsx
import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { connect } from "@joyid/ckb";
import {
  getSUDTBalance,
  transferSUDT,
  mintSUDT,
  transferSUDTWithJoyID,
} from "./lib";

function App() {
  const [address, setAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  // Shared private key for signing
  const [privKey, setPrivKey] = useState("");

  // Transfer state
  const [recipient, setRecipient] = useState("");
  const [transferAmount, setTransferAmount] = useState("1");
  const [txStatus, setTxStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  // Mint state
  const [mintRecipient, setMintRecipient] = useState("");
  const [mintAmount, setMintAmount] = useState("1000");
  const [mintStatus, setMintStatus] = useState<string | null>(null);
  const [minting, setMinting] = useState(false);

  // Restore wallet after reload/redirect
  useEffect(() => {
    const saved = localStorage.getItem("ckb_address");
    if (saved) {
      setAddress(saved);
      fetchBalance(saved);
    }
  }, []);

  // Auto-fill mint recipient when wallet connects
  useEffect(() => {
    if (address) setMintRecipient(address);
  }, [address]);

  const fetchBalance = async (addr: string) => {
    setLoading(true);
    setBalance(null);
    try {
      const bal = await getSUDTBalance(addr);
      setBalance(bal.toString());
    } catch {
      setBalance("Error");
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await connect({ redirectURL: window.location.origin });
      if (res.address) {
        setAddress(res.address);
        localStorage.setItem("ckb_address", res.address);
        fetchBalance(res.address);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setConnecting(false);
    }
  };

  const handleMint = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privKey || !mintRecipient || !mintAmount) return;
    setMinting(true);
    setMintStatus(null);
    try {
      const hash = await mintSUDT(privKey, mintRecipient, mintAmount);
      setMintStatus(`✅ Minted! TX: ${hash}`);
      if (address) fetchBalance(address);
    } catch (err: any) {
      setMintStatus(`❌ Mint failed: ${err.message || "Unknown error"}`);
    } finally {
      setMinting(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!privKey || !recipient || !transferAmount) return;
    setSending(true);
    setTxStatus(null);
    try {
      const hash = await transferSUDT(privKey, recipient, transferAmount);
      setTxStatus(`✅ Sent! TX: ${hash}`);
      if (address) fetchBalance(address);
    } catch (err: any) {
      setTxStatus(`❌ Transfer failed: ${err.message || "Unknown error"}`);
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "system-ui, sans-serif",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      <h1>CKB SUDT Wallet</h1>

      {/* Wallet Connect */}
      {!address ? (
        <div style={{ textAlign: "center", padding: "2rem 0" }}>
          <button
            onClick={handleConnect}
            disabled={connecting}
            style={btnStyle.primary}
          >
            {connecting ? "Redirecting..." : "🔗 Connect JoyID Wallet"}
          </button>
        </div>
      ) : (
        <div style={cardStyle}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "1rem",
            }}
          >
            <p style={{ color: "#2e7d32", margin: 0, fontWeight: 600 }}>
              ✅ Wallet Connected
            </p>
            <button
              onClick={() => {
                localStorage.removeItem("ckb_address");
                setAddress(null);
                setBalance(null);
              }}
              style={btnStyle.secondary}
            >
              Disconnect
            </button>
          </div>
          <code style={codeStyle}>{address}</code>
          <button
            onClick={() => fetchBalance(address)}
            disabled={loading}
            style={{ ...btnStyle.primary, width: "100%", marginTop: "0.5rem" }}
          >
            {loading ? "Querying..." : "🔍 Refresh Balance"}
          </button>
          {balance !== null && (
            <div
              style={{
                ...balanceStyle,
                background: balance === "Error" ? "#ffebee" : "#e8f5e9",
              }}
            >
              Balance: {balance} tokens
            </div>
          )}
        </div>
      )}

      {/* Mint Section */}
      <div
        style={{
          ...cardStyle,
          marginTop: "1.5rem",
          borderLeft: "4px solid #2e7d32",
        }}
      >
        <h2 style={{ margin: "0 0 1rem 0" }}>
          🪙 Mint SUDT Tokens (Owner Mode)
        </h2>
        <form
          onSubmit={handleMint}
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <input
            type="password"
            placeholder="Owner Private Key (0x...)"
            value={privKey}
            onChange={(e) => setPrivKey(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="text"
            placeholder="Recipient Address (ckt1q...)"
            value={mintRecipient}
            onChange={(e) => setMintRecipient(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="number"
            placeholder="Amount to Mint"
            value={mintAmount}
            onChange={(e) => setMintAmount(e.target.value)}
            style={inputStyle}
            required
          />
          <button
            type="submit"
            disabled={minting}
            style={{
              ...btnStyle.primary,
              background: minting ? "#ccc" : "#2e7d32",
            }}
          >
            {minting ? "Minting..." : "Mint Tokens"}
          </button>
        </form>
        {mintStatus && (
          <p
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: mintStatus.startsWith("✅") ? "#e8f5e9" : "#ffebee",
              borderRadius: "6px",
              wordBreak: "break-all",
            }}
          >
            {mintStatus}
          </p>
        )}
      </div>

      {/* Transfer Section */}
      <div
        style={{
          ...cardStyle,
          marginTop: "1.5rem",
          borderLeft: "4px solid #1976d2",
        }}
      >
        <h2 style={{ margin: "0 0 1rem 0" }}>📤 Send SUDT Tokens</h2>

        {/* Dev Mode: Private Key Signing */}
        <form
          onSubmit={handleTransfer}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "0.75rem",
            marginBottom: "1rem",
            paddingBottom: "1rem",
            borderBottom: "1px solid #eee",
          }}
        >
          <p
            style={{
              margin: "0 0 0.5rem 0",
              fontSize: "0.85rem",
              color: "#666",
            }}
          >
            🔧 Dev Mode: Uses private key signer
          </p>
          <input
            type="password"
            placeholder="Sender Private Key (0x...)"
            value={privKey}
            onChange={(e) => setPrivKey(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="text"
            placeholder="Recipient Address (ckt1q...)"
            value={recipient}
            onChange={(e) => setRecipient(e.target.value)}
            style={inputStyle}
            required
          />
          <input
            type="number"
            placeholder="Amount"
            value={transferAmount}
            onChange={(e) => setTransferAmount(e.target.value)}
            style={inputStyle}
            required
          />
          <button
            type="submit"
            disabled={sending}
            style={{
              ...btnStyle.primary,
              background: sending ? "#ccc" : "#1976d2",
            }}
          >
            {sending ? "Sending (Dev)..." : "Send (Dev Mode)"}
          </button>
        </form>

        {/* JoyID Mode: Passkey Signing */}
        <button
          onClick={async () => {
            if (!address || !recipient || !transferAmount) {
              alert("Please connect wallet, set recipient, and amount");
              return;
            }
            setSending(true);
            setTxStatus(null);
            try {
              const hash = await transferSUDTWithJoyID(
                address,
                recipient,
                transferAmount,
              );
              setTxStatus(`✅ Sent via JoyID! TX: ${hash}`);
              if (address) fetchBalance(address);
            } catch (err: any) {
              setTxStatus(
                `❌ JoyID transfer failed: ${err.message || "User cancelled or error"}`,
              );
            } finally {
              setSending(false);
            }
          }}
          disabled={sending || !address}
          style={{ ...btnStyle.primary, width: "100%", background: "#9c27b0" }}
        >
          🔐 Send via JoyID (Passkey)
        </button>

        {txStatus && (
          <p
            style={{
              marginTop: "1rem",
              padding: "0.75rem",
              background: txStatus.startsWith("✅") ? "#e8f5e9" : "#ffebee",
              borderRadius: "6px",
              wordBreak: "break-all",
            }}
          >
            {txStatus}
          </p>
        )}
      </div>
    </div>
  );
}

// Inline styles
const cardStyle = {
  border: "1px solid #ddd",
  padding: "1.5rem",
  borderRadius: "8px",
};
const codeStyle = {
  display: "block",
  background: "#f5f5f5",
  padding: "0.5rem",
  borderRadius: "4px",
  wordBreak: "break-all",
  fontSize: "0.85rem",
};
const balanceStyle = {
  marginTop: "1rem",
  padding: "1rem",
  borderRadius: "6px",
  textAlign: "center",
  border: "1px solid #ccc",
};
const inputStyle = {
  padding: "0.5rem",
  fontSize: "1rem",
  borderRadius: "4px",
  border: "1px solid #ccc",
  boxSizing: "border-box",
};
const btnStyle = {
  primary: {
    padding: "0.6rem 1rem",
    fontSize: "1rem",
    color: "white",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background 0.2s",
  },
  secondary: {
    background: "#f5f5f5",
    border: "1px solid #ccc",
    padding: "0.4rem 0.8rem",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "0.85rem",
  },
};

const container = document.getElementById("root");
const root = createRoot(container!);
root.render(<App />);
