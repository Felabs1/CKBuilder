import React, { useEffect, useState } from "react";
import ConnectWallet from "./components/ConnectWallet";
import { ccc } from "@ckb-ccc/connector-react";
import { mintSporeWithCCC, showSporeContent } from "./lib";

function App() {
  const { wallet } = ccc.useCcc();
  const signer = ccc.useSigner(); // <-- Brought in the signer
  const [address, setAddress] = useState<string>("");

  // File and Spore State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState<Uint8Array | null>(null);
  const [fileType, setFileType] = useState<string>("");

  const [isMinting, setIsMinting] = useState(false);
  const [txHash, setTxHash] = useState<string>();

  const [rawSporeData, setRawSporeData] = useState<any>();
  const [imageURL, setImageURL] = useState<string>();

  // Use the signer to fetch the address, just like in your ConnectWallet component
  useEffect(() => {
    const fetchAddress = async () => {
      if (signer) {
        const addr = await signer.getRecommendedAddress();
        setAddress(addr);
      } else {
        setAddress("");
      }
    };
    fetchAddress();
  }, [signer]); // <-- Watch the signer, not the wallet

  const createSpore = async () => {
    if (!signer || !fileContent) return;
    setIsMinting(true);
    setTxHash(undefined);
    try {
      const { txHash, outputIndex } = await mintSporeWithCCC(
        signer,
        fileContent,
        fileType,
      );
      setTxHash(txHash);
      console.log(`Success! TX: ${txHash}, Index: ${outputIndex}`);
    } catch (error: any) {
      console.error("Minting failed:", error);
      alert(`Transaction failed: ${error.message || String(error)}`);
    } finally {
      setIsMinting(false);
    }
  };

  const renderSpore = async () => {
    if (!signer || !txHash) return;
    try {
      const res = await showSporeContent(signer, txHash, 0);
      if (!res) return;
      setRawSporeData(res);

      // Strip the '0x' from the hex string and convert back to binary
      const hex = res.content.toString().startsWith("0x")
        ? res.content.toString().slice(2)
        : res.content.toString();

      const buffer = new Uint8Array(
        hex.match(/.{1,2}/g)?.map((byte: string) => parseInt(byte, 16)) || [],
      );

      // Create a blob URL to render the image
      const blob = new Blob([buffer], { type: res.contentType });
      const url = URL.createObjectURL(blob);
      setImageURL(url);
    } catch (error) {
      console.error("Failed to render Spore content:", error);
      alert("Failed to load Spore. It might still be confirming on-chain.");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      const MAX_SIZE_BYTES = 300 * 1024; // 300KB

      if (file.size > MAX_SIZE_BYTES) {
        alert("File is too large! Please keep it under 300KB.");
        event.target.value = "";
        setSelectedFile(null);
        setFileContent(null);
        setFileType("");
        return;
      }

      setSelectedFile(file);
      setFileType(file.type || "application/octet-stream");

      const reader = new FileReader();
      reader.onload = () => {
        const content = reader.result;
        if (content && content instanceof ArrayBuffer) {
          setFileContent(new Uint8Array(content));
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  // const createSpore = async () => {
  //   if (!signer || !fileContent) return;
  //   setIsMinting(true);
  //   try {
  //     console.log(
  //       "Minting clicked! We will integrate the CCC signer here in Step 2.",
  //     );
  //     // Placeholder: The actual minting transaction logic goes here next
  //   } catch (error) {
  //     console.error("Minting failed:", error);
  //   } finally {
  //     setIsMinting(false);
  //   }
  // };

  const enabled = !!signer && !!fileContent;

  return (
    <div className="min-h-screen p-8 sm:p-20 font-[family-name:var(--font-geist-sans)] flex flex-col items-center gap-8 text-black dark:text-white">
      <main className="flex flex-col gap-8 w-full max-w-2xl">
        <h1 className="text-3xl font-bold text-center">
          Create On-Chain Digital Objects (DOBs)
        </h1>

        {/* Wallet Connection Area */}
        <div className="flex flex-col gap-4 items-center bg-black/[.05] dark:bg-white/[.05] p-6 rounded-xl border border-black/[0.1] dark:border-white/[0.1]">
          <ConnectWallet />
          {address && (
            <div className="text-sm break-all text-center mt-2">
              <span className="font-semibold text-green-600 dark:text-green-400">
                ✅ Connected:
              </span>
              <br />
              <code className="text-cyan-600 dark:text-cyan-400 mt-1 inline-block">
                {address}
              </code>
            </div>
          )}
        </div>

        {/* File Upload Area */}
        <div className="flex flex-col gap-4 bg-black/[.05] dark:bg-white/[.05] p-6 rounded-xl border border-black/[0.1] dark:border-white/[0.1]">
          <h2 className="text-xl font-semibold">Upload DOB Image</h2>
          <input
            type="file"
            onChange={handleFileChange}
            disabled={!wallet}
            className="block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-50 file:text-cyan-700 hover:file:bg-cyan-100 disabled:opacity-50"
          />
          {selectedFile && (
            <div className="text-sm mt-2">
              <p>
                <strong>Size:</strong> {selectedFile.size} bytes
              </p>
              <p>
                <strong>Type:</strong> {fileType}
              </p>
            </div>
          )}
        </div>

        {/* Action Button */}
        <button
          disabled={!enabled || isMinting}
          onClick={createSpore}
          className="rounded-full bg-cyan-600 text-white font-bold py-3 px-6 transition-colors hover:bg-cyan-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isMinting ? "Minting DOB..." : "Create DOB"}
        </button>

        {txHash && (
          <div className="flex flex-col gap-4 w-full mt-4">
            <button
              onClick={renderSpore}
              className="rounded-full bg-green-600 text-white font-bold py-3 px-6 transition-colors hover:bg-green-700"
            >
              Fetch Minted DOB from Blockchain
            </button>

            {rawSporeData && (
              <div className="p-4 bg-black/[.05] dark:bg-white/[.05] rounded-xl border border-black/[0.1] dark:border-white/[0.1] text-sm">
                <p>
                  <strong>Content Type:</strong> {rawSporeData.contentType}
                </p>
              </div>
            )}

            {imageURL && (
              <div className="flex justify-center mt-4">
                <img
                  src={imageURL}
                  alt="Spore DOB content"
                  className="max-w-full h-auto rounded-xl shadow-lg border border-slate-200 dark:border-slate-800"
                />
              </div>
            )}
          </div>
        )}

        {txHash && (
          <div className="p-4 bg-green-100 text-green-900 rounded-xl break-all text-sm border border-green-300">
            <strong>Transaction Hash:</strong> {txHash}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
