import React, { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Video,
  Radio,
  Settings,
  Plus,
  Send,
  MessageSquare,
  Play,
  Sparkles,
  ShoppingBag,
  Type,
  Mic,
  MonitorPlay,
  Layers,
  Zap,
  ChevronRight,
  Download,
  CheckCircle2,
  Maximize2,
  Clock,
  ExternalLink,
  Cpu,
  Activity,
  Database,
  CloudLightning,
  Monitor,
  Terminal,
  Upload,
  Share2,
  Globe,
  HelpCircle,
  Volume2,
  ArrowRight,
  Bell,
  ChevronDown,
  Users,
  User,
  Menu,
  X,
  Heart,
  Key,
  Search,
  Link,
  Smartphone,
  FileText,
  Crop,
  Scissors,
  Focus,
  TrendingUp,
  Video as VideoIcon,
  ShieldCheck,
  Server,
  Loader2,
  LogOut,
  Mail,
  Lock,
  Crown,
  CreditCard,
  Check,
  Square,
} from "lucide-react";

// --- Firebase Imports ---
import { initializeApp, getApps, getApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";
import { getFirestore, doc, setDoc } from "firebase/firestore";

// --- Firebase Initialization ---
const firebaseConfig =
  typeof __firebase_config !== "undefined"
    ? JSON.parse(__firebase_config)
    : {
        apiKey: "AIzaSyCUYxPNqsX-k3ZWLMXPgddY65MP4uCvN98",
        authDomain: "last-d16fa.firebaseapp.com",
        projectId: "last-d16fa",
        storageBucket: "last-d16fa.firebasestorage.app",
        messagingSenderId: "586971280047",
        appId: "1:586971280047:web:074b08ec1dca299fa31a5a",
        measurementId: "G-P64KC5T3HV",
      };

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== "undefined" ? __app_id : "default-app-id";

// 내부 시스템 API 키
const apiKey = "AIzaSyAvNCFP29yHDzi5QzvxVZxXo2oOuVgX-g4";

const fetchWithRetry = async (url, options, retries = 3) => {
  const delays = [1000, 2000, 4000];
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        console.error(`API Error (${res.status}):`, errData);
        throw new Error(errData?.error?.message || `HTTP ${res.status}`);
      }
      return await res.json();
    } catch (e) {
      if (i === retries - 1) throw e;
      await new Promise((r) => setTimeout(r, delays[i]));
    }
  }
};

const generateText = async (prompt, useSearch = false, activeApiKey = "") => {
  const modelName = "gemini-2.5-flash";
  const finalKey = activeApiKey || apiKey;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${finalKey}`;

  const payload = { contents: [{ parts: [{ text: prompt }] }] };

  if (useSearch) {
    payload.tools = [{ google_search: {} }];
  }

  try {
    const data = await fetchWithRetry(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "응답 생성 실패";
  } catch (err) {
    if (useSearch && err.message.includes("400")) {
      console.warn("검색 툴 에러 발생. 일반 모드로 재시도합니다...", err);
      delete payload.tools;
      const fallbackData = await fetchWithRetry(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return (
        fallbackData.candidates?.[0]?.content?.parts?.[0]?.text ||
        "응답 생성 실패"
      );
    }
    throw err;
  }
};

const base64ToWavUrl = (base64Str, sampleRate) => {
  const binaryStr = atob(base64Str);
  const dataLen = binaryStr.length;
  const bytes = Uint8Array.from(binaryStr, (c) => c.charCodeAt(0));
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataLen, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, dataLen, true);

  const blob = new Blob([buffer, bytes], { type: "audio/wav" });
  return URL.createObjectURL(blob);
};

const generateTTS = async (text, voiceName = "Aoede", activeApiKey = "") => {
  const finalKey = activeApiKey || apiKey;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${finalKey}`;
  const payload = {
    contents: [{ parts: [{ text: text }] }],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName } },
      },
    },
    model: "gemini-2.5-flash-preview-tts",
  };

  const data = await fetchWithRetry(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const inlineData = data.candidates?.[0]?.content?.parts?.[0]?.inlineData;
  if (!inlineData) throw new Error("Audio data not found in response");

  const match = inlineData.mimeType.match(/rate=(\d+)/);
  const sampleRate = match ? parseInt(match[1]) : 24000;
  return base64ToWavUrl(inlineData.data, sampleRate);
};

const AnimatedNumber = ({ endValue, prefix = "", suffix = "" }) => {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const end = parseFloat(endValue.replace(/,/g, ""));
    let start = 0;
    const duration = 1500;
    const increment = end / (duration / 16);
    const timer = setInterval(() => {
      start += increment;
      if (start >= end) {
        setValue(end);
        clearInterval(timer);
      } else {
        setValue(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [endValue]);

  return (
    <span>
      {prefix}
      {value.toLocaleString()}
      {suffix}
    </span>
  );
};

const getDisplayTitle = (input, fetchedName) => {
  if (fetchedName) return fetchedName;
  if (!input) return "상품 미지정";
  if (input.startsWith("http")) {
    try {
      const url = new URL(input);
      let domain = url.hostname.replace("www.", "");
      return `🔗 웹 연동 상품 (${domain})`;
    } catch {
      return "🔗 웹 링크 상품";
    }
  }
  return input;
};

const App = () => {
  useEffect(() => {
    if (!document.getElementById("tailwind-cdn")) {
      const script = document.createElement("script");
      script.id = "tailwind-cdn";
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  // --- Auth State ---
  const [user, setUser] = useState(null);
  const [isAuthChecking, setIsAuthChecking] = useState(true);
  const [authMode, setAuthMode] = useState("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== "undefined" && __initial_auth_token) {
        try {
          await signInWithCustomToken(auth, __initial_auth_token);
        } catch (e) {
          console.error("Auto-login failed", e);
        }
      }
    };
    initAuth();

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setIsAuthChecking(false);
      if (!currentUser) {
        setIsAuthLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    setIsAuthLoading(true);

    try {
      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
      } else {
        const userCredential = await createUserWithEmailAndPassword(
          auth,
          authEmail,
          authPassword
        );
        await setDoc(
          doc(
            db,
            "artifacts",
            appId,
            "users",
            userCredential.user.uid,
            "profile",
            "data"
          ),
          {
            name: authName || "New User",
            email: authEmail,
            createdAt: new Date().toISOString(),
            role: "creator",
          }
        );
      }
    } catch (err) {
      console.error("Auth Error:", err);
      switch (err.code) {
        case "auth/invalid-email":
          setAuthError("유효하지 않은 이메일 형식입니다.");
          break;
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
          setAuthError("이메일 또는 비밀번호가 올바르지 않습니다.");
          break;
        case "auth/email-already-in-use":
          setAuthError("이미 가입된 이메일입니다. 다른 이메일로 가입해주세요.");
          break;
        case "auth/weak-password":
          setAuthError("비밀번호는 최소 6자리 이상으로 설정해주세요.");
          break;
        case "auth/missing-password":
          setAuthError("비밀번호를 입력해주세요.");
          break;
        case "auth/network-request-failed":
          setAuthError("네트워크 연결 상태를 확인해주세요.");
          break;
        case "auth/too-many-requests":
          setAuthError(
            "로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요."
          );
          break;
        default:
          setAuthError(
            "로그인(회원가입) 처리 중 오류가 발생했습니다. 다시 시도해주세요."
          );
          break;
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setAuthError("");
    setIsAuthLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);

      await setDoc(
        doc(
          db,
          "artifacts",
          appId,
          "users",
          result.user.uid,
          "profile",
          "data"
        ),
        {
          name: result.user.displayName || "Google User",
          email: result.user.email,
          lastLogin: new Date().toISOString(),
          role: "creator",
        },
        { merge: true }
      );
    } catch (err) {
      console.error("Google Login Error:", err);
      if (err.code === "auth/popup-closed-by-user") {
        setAuthError("로그인 팝업 창이 닫혔습니다. 다시 시도해주세요.");
      } else if (err.code === "auth/popup-blocked") {
        setAuthError(
          "팝업이 차단되었습니다. 브라우저에서 팝업을 허용해주세요."
        );
      } else if (err.code === "auth/unauthorized-domain") {
        setAuthError(
          "Firebase에 승인되지 않은 도메인입니다. 설정을 확인해주세요."
        );
      } else {
        setAuthError(`구글 로그인 실패: ${err.code || err.message}`);
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsAuthLoading(false);
      await signOut(auth);
    } catch (err) {
      console.error("Sign out error", err);
    }
  };

  // --- Main App States ---
  const [activeTab, setActiveTab] = useState("create");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // --- 프리미엄 및 결제 상태 ---
  const [isPremium, setIsPremium] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const [isPaymentProcessing, setIsPaymentProcessing] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("quick");
  const [isTermsChecked, setIsTermsChecked] = useState(true);

  // --- Brand Assets 관리  ---
  const [brandAssets, setBrandAssets] = useState([
    {
      url: "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=400&h=400&fit=crop&q=80",
      type: "image",
    },
    {
      url: "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=400&h=400&fit=crop&q=80",
      type: "image",
    },
    {
      url: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=400&h=400&fit=crop&q=80",
      type: "image",
    },
    {
      url: "https://images.unsplash.com/photo-1503602642458-232111445657?w=400&h=400&fit=crop&q=80",
      type: "image",
    },
  ]);
  const assetInputRef = useRef(null);

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 용량 제한 체크 (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert("50MB 이하의 파일만 업로드 가능합니다.");
      return;
    }

    // 파일 로컬 URL 생성 및 상태 업데이트
    const fileUrl = URL.createObjectURL(file);
    const fileType = file.type.startsWith("video/") ? "video" : "image";

    setBrandAssets((prev) => [{ url: fileUrl, type: fileType }, ...prev]);

    // 같은 파일을 다시 선택할 수 있도록 초기화
    if (assetInputRef.current) assetInputRef.current.value = "";
  };

  const handleMockPayment = async () => {
    if (!isTermsChecked) {
      alert("결제 서비스 이용 약관에 동의해주세요.");
      return;
    }

    setIsPaymentProcessing(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      setIsPremium(true);
      setShowPremiumModal(false);
      alert(
        "🎉 결제가 성공적으로 완료되었습니다!\nStudio.ai PRO의 모든 기능을 무제한으로 사용하실 수 있습니다."
      );
    } catch (error) {
      console.error("결제 에러:", error);
      alert("결제 처리 중 오류가 발생했습니다.");
    } finally {
      setIsPaymentProcessing(false);
    }
  };

  // --- PRO 기능 상태 ---
  const [selectedLanguage, setSelectedLanguage] = useState("ko");

  const [productUrl, setProductUrl] = useState(
    "https://www.apple.com/kr/airpods-pro/"
  );
  const [fetchedProductName, setFetchedProductName] = useState(
    "Apple AirPods Pro 2세대"
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [extractingStep, setExtractingStep] = useState(0);
  const [script, setScript] = useState("");
  const [selectedAvatar, setSelectedAvatar] = useState(1);
  const [selectedVoice, setSelectedVoice] = useState("Zephyr");
  const [isVoiceMenuOpen, setIsVoiceMenuOpen] = useState(false);
  const [scriptTone, setScriptTone] = useState("전문적이고 신뢰감 있는");
  const [scriptFormat, setScriptFormat] = useState("라이브 방송");

  const [isStreaming, setIsStreaming] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [isRenderingVOD, setIsRenderingVOD] = useState(false);
  const [isPlayingVOD, setIsPlayingVOD] = useState(false);

  const [previewingAvatar, setPreviewingAvatar] = useState(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [isDownloadingVideo, setIsDownloadingVideo] = useState(false);

  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [connectionStep, setConnectionStep] = useState(0);

  // 내부 설정용 (UI에서는 숨김 처리됨)
  const [geminiKeyInput, setGeminiKeyInput] = useState("");
  const [customGeminiKey, setCustomGeminiKey] = useState("");

  const [avatarProvider, setAvatarProvider] = useState("did");
  const [heygenApiKey, setHeygenApiKey] = useState("");
  const [didApiKey, setDidApiKey] = useState("");
  const [useHeygen, setUseHeygen] = useState(false);
  const [heygenStatus, setHeygenStatus] = useState("idle");

  const [reactions, setReactions] = useState([]);
  const [liveNotification, setLiveNotification] = useState(null);

  const [chatHistory, setChatHistory] = useState([
    {
      id: 1,
      user: "System",
      text: "AI 쇼핑 호스트 모듈이 시작되었습니다. 우측 입력창에 질문을 입력해보세요!",
      type: "system",
    },
  ]);

  const [pipelineStep, setPipelineStep] = useState("idle");

  const currentAudioRef = useRef(null);
  const streamVideoRef = useRef(null);
  const mediaStreamRef = useRef(null);

  const heygenAvatarInstance = useRef(null);
  const peerConnectionRef = useRef(null);
  const didStreamIdRef = useRef(null);
  const didSessionIdRef = useRef(null);

  const avatars = [
    {
      id: 1,
      name: "아바 (Ava)",
      heygenId: "anna_public_3_20240108",
      gender: "female",
      style: "우아함",
      img: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1024&h=1024&fit=crop&crop=faces&q=80",
    },
    {
      id: 2,
      name: "리암 (Liam)",
      heygenId: "josh_lite3_20230714",
      gender: "male",
      style: "역동적",
      img: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1024&h=1024&fit=crop&crop=faces&q=80",
    },
    {
      id: 3,
      name: "클로이 (Chloe)",
      heygenId: "anna_public_3_20240108",
      gender: "female",
      style: "미니멀",
      img: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=1024&h=1024&fit=crop&crop=faces&q=80",
    },
  ];

  const formatOptions = [
    "라이브 방송",
    "유튜브 쇼츠",
    "인스타 릴스",
    "블로그 롱폼",
  ];

  const voiceOptions = [
    { id: "Zephyr", gender: "female", label: "제퍼 (밝고 화사함)" },
    { id: "Puck", gender: "male", label: "퍽 (경쾌함)" },
    { id: "Charon", gender: "male", label: "카론 (유익하고 신뢰감 있음)" },
    { id: "Kore", gender: "female", label: "코레 (단단하고 명확함)" },
    { id: "Fenrir", gender: "male", label: "펜리르 (활발하고 흥미진진함)" },
    { id: "Leda", gender: "female", label: "레다 (젊고 생기있음)" },
    { id: "Orus", gender: "male", label: "오루스 (단호함)" },
    { id: "Aoede", gender: "female", label: "아오에데 (산뜻하고 가벼움)" },
  ];

  const currentAvatarGender =
    avatars.find((a) => a.id === selectedAvatar)?.gender || "female";
  const currentAvatarName =
    avatars.find((a) => a.id === selectedAvatar)?.name.split(" ")[0] ||
    "AI 호스트";

  const handleLanguageSelect = (lang) => {
    if (lang !== "ko" && !isPremium) {
      setShowPremiumModal(true);
      return;
    }
    setSelectedLanguage(lang);
  };

  const filteredVoices = voiceOptions.filter(
    (v) => v.gender === currentAvatarGender
  );

  const progressSteps = [
    { id: 1, label: "엔진 인증 및 권한 확인" },
    { id: 2, label: "WebRTC 터널링 및 스트림 생성" },
    { id: 3, label: "AI 아바타 동기화 및 SDP 교환" },
    { id: 4, label: "라이브 송출 렌더링 준비 완료" },
  ];

  const initAvatarStream = async () => {
    try {
      setHeygenStatus("connecting");
      setConnectionStep(1);
      setIsVideoPlaying(false);

      if (avatarProvider === "heygen") {
        if (!heygenApiKey) throw new Error("HeyGen API Key is missing.");

        const tokenRes = await fetch(
          "https://api.heygen.com/v1/streaming.create_token",
          {
            method: "POST",
            headers: { "x-api-key": heygenApiKey },
          }
        );
        if (!tokenRes.ok)
          throw new Error("Invalid HeyGen API Key (Auth Failed)");
        const tokenData = await tokenRes.json();
        const token = tokenData.data.token;

        setConnectionStep(2);
        const heygenModule = await import(
          "https://esm.sh/@heygen/streaming-avatar@1.2.2"
        );
        const StreamingAvatar = heygenModule.default;

        const avatar = new StreamingAvatar({ token });
        heygenAvatarInstance.current = avatar;

        avatar.on("streamReady", (event) => {
          mediaStreamRef.current = event.detail;
          if (streamVideoRef.current) {
            streamVideoRef.current.srcObject = event.detail;
            streamVideoRef.current.onloadedmetadata = () => {
              streamVideoRef.current
                .play()
                .catch((e) => console.error("Play blocked:", e));
            };
          }
        });

        avatar.on("streamDisconnected", () => {
          setHeygenStatus("idle");
          setConnectionStep(0);
          setIsVideoPlaying(false);
          mediaStreamRef.current = null;
        });

        setConnectionStep(3);
        const selectedAvatarData = avatars.find((a) => a.id === selectedAvatar);

        await avatar.createStartAvatar({
          quality: "medium",
          avatarName: selectedAvatarData.heygenId,
        });

        setHeygenStatus("connected");
        setConnectionStep(4);
      } else if (avatarProvider === "did") {
        if (!didApiKey) throw new Error("D-ID API Key is missing.");

        const authHeader = `Basic ${
          didApiKey.includes(":") ? btoa(didApiKey) : didApiKey
        }`;
        const avatarUrl = avatars.find((a) => a.id === selectedAvatar)?.img;

        const streamRes = await fetch("https://api.d-id.com/talks/streams", {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ source_url: avatarUrl }),
        });

        const streamData = await streamRes.json();
        if (!streamRes.ok)
          throw new Error(
            streamData.description || "D-ID Stream Creation Failed"
          );

        didStreamIdRef.current = streamData.id;
        didSessionIdRef.current = streamData.session_id;

        setConnectionStep(2);
        const pc = new RTCPeerConnection({
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
        });
        peerConnectionRef.current = pc;

        pc.onicecandidate = (event) => {
          if (event.candidate) {
            fetch(`https://api.d-id.com/talks/streams/${streamData.id}/ice`, {
              method: "POST",
              headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                candidate: event.candidate.candidate,
                sdpMid: event.candidate.sdpMid,
                sdpMLineIndex: event.candidate.sdpMLineIndex,
                session_id: streamData.session_id,
              }),
            }).catch((e) => console.error("ICE Error:", e));
          }
        };

        pc.ontrack = (event) => {
          if (event.track.kind === "video") {
            mediaStreamRef.current = event.streams[0];
            if (streamVideoRef.current) {
              streamVideoRef.current.srcObject = event.streams[0];
              streamVideoRef.current.onloadedmetadata = () => {
                streamVideoRef.current
                  .play()
                  .catch((e) => console.error("Play blocked by browser:", e));
              };
            }
          }
        };

        setConnectionStep(3);
        await pc.setRemoteDescription(
          new RTCSessionDescription(streamData.offer)
        );
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await fetch(`https://api.d-id.com/talks/streams/${streamData.id}/sdp`, {
          method: "POST",
          headers: {
            Authorization: authHeader,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            answer: answer,
            session_id: streamData.session_id,
          }),
        });

        setHeygenStatus("connected");
        setConnectionStep(4);
      }
    } catch (err) {
      setHeygenStatus("error");
      setConnectionStep(0);
      setIsVideoPlaying(false);
      mediaStreamRef.current = null;
      console.error(err);
      alert(
        `${avatarProvider.toUpperCase()} 연결에 실패했습니다: ${
          err.message
        }\n내부 API 연동이 필요합니다.`
      );
      setIsStreaming(false);
      setUseHeygen(false);
    }
  };

  const stopAvatarStream = async () => {
    if (avatarProvider === "heygen" && heygenAvatarInstance.current) {
      try {
        await heygenAvatarInstance.current.stopAvatar();
      } catch (e) {
        console.error("Error stopping avatar", e);
      }
      heygenAvatarInstance.current = null;
    } else if (avatarProvider === "did" && didStreamIdRef.current) {
      try {
        const authHeader = `Basic ${
          didApiKey.includes(":") ? btoa(didApiKey) : didApiKey
        }`;
        await fetch(
          `https://api.d-id.com/talks/streams/${didStreamIdRef.current}`,
          {
            method: "DELETE",
            headers: {
              Authorization: authHeader,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ session_id: didSessionIdRef.current }),
          }
        );
      } catch (e) {
        console.error("Error stopping D-ID stream", e);
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close();
        peerConnectionRef.current = null;
      }
      didStreamIdRef.current = null;
      didSessionIdRef.current = null;
    }

    setHeygenStatus("idle");
    setConnectionStep(0);
    setIsVideoPlaying(false);
    mediaStreamRef.current = null;
    if (streamVideoRef.current) {
      streamVideoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (isStreaming) {
      if (
        useHeygen &&
        ((avatarProvider === "heygen" && heygenApiKey) ||
          (avatarProvider === "did" && didApiKey))
      ) {
        initAvatarStream();
      } else {
        setConnectionStep(4);
      }
    } else {
      if (useHeygen) {
        stopAvatarStream();
      } else {
        setConnectionStep(0);
      }
    }
    // eslint-disable-next-line
  }, [
    isStreaming,
    useHeygen,
    heygenApiKey,
    didApiKey,
    avatarProvider,
    selectedAvatar,
  ]);

  useEffect(() => {
    if (
      activeTab === "live" &&
      streamVideoRef.current &&
      mediaStreamRef.current
    ) {
      if (streamVideoRef.current.srcObject !== mediaStreamRef.current) {
        streamVideoRef.current.srcObject = mediaStreamRef.current;
        setIsVideoPlaying(false);
        streamVideoRef.current
          .play()
          .catch((e) => console.error("Play blocked during tab restore:", e));
      }
    }
  }, [activeTab]);

  const stopCurrentAudio = () => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.currentTime = 0;
      currentAudioRef.current = null;
    }
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsPlayingAudio(false);
    setIsPlayingVOD(false);
    setPreviewingAvatar(null);
    setIsPreviewLoading(false);
    setIsRenderingVOD(false);
  };

  useEffect(() => {
    const currentVoiceObj = voiceOptions.find((v) => v.id === selectedVoice);
    if (currentVoiceObj && currentVoiceObj.gender !== currentAvatarGender) {
      const firstMatchingVoice = voiceOptions.find(
        (v) => v.gender === currentAvatarGender
      );
      if (firstMatchingVoice) setSelectedVoice(firstMatchingVoice.id);
    }
  }, [selectedAvatar]);

  useEffect(() => {
    if (!isStreaming) return;
    const reactionInterval = setInterval(() => {
      if (Math.random() > 0.4) {
        const id = Date.now();
        const emojis = ["❤️", "👍", "🔥", "👏", "✨"];
        const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
        const leftOffset = Math.floor(Math.random() * 40);
        setReactions((prev) => [
          ...prev,
          { id, emoji: randomEmoji, leftOffset },
        ]);
        setTimeout(
          () => setReactions((prev) => prev.filter((r) => r.id !== id)),
          2000
        );
      }
    }, 600);

    const notificationInterval = setInterval(() => {
      if (Math.random() > 0.7) {
        const names = ["user12**", "choi_**", "park99**", "jennie**"];
        const randomName = names[Math.floor(Math.random() * names.length)];
        setLiveNotification(
          `${randomName}님이 라이브 한정 혜택으로 구매하셨습니다! 🛍️`
        );
        setTimeout(() => setLiveNotification(null), 3500);
      }
    }, 5000);

    return () => {
      clearInterval(reactionInterval);
      clearInterval(notificationInterval);
    };
  }, [isStreaming]);

  const handlePreviewVoice = async (e, avatar) => {
    e.stopPropagation();

    if (previewingAvatar === avatar.id) {
      stopCurrentAudio();
      return;
    }

    stopCurrentAudio();
    setPreviewingAvatar(avatar.id);
    setIsPreviewLoading(true);

    try {
      const voiceId =
        voiceOptions.find((v) => v.gender === avatar.gender)?.id || "Aoede";

      const text = `안녕하세요! 저는 쇼핑 호스트 ${
        avatar.name.split(" ")[0]
      }입니다. 제 목소리 어떠신가요?`;

      const audioUrl = await generateTTS(text, voiceId, customGeminiKey);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onplay = () => setIsPreviewLoading(false);
      audio.onended = () => {
        setPreviewingAvatar(null);
        setIsPreviewLoading(false);
      };
      audio.play();
    } catch (err) {
      console.error("제미나이 TTS 오류:", err);
      alert(`제미나이 음성 생성에 실패했습니다. (${err.message})`);
      setPreviewingAvatar(null);
      setIsPreviewLoading(false);
    }
  };

  const handleGenerateScript = async () => {
    if (!productUrl) return;
    setIsGenerating(true);
    setScript("");

    const isUrl = /^https?:\/\//.test(productUrl);
    const isShorts =
      scriptFormat.includes("쇼츠") || scriptFormat.includes("릴스");

    const runFakeLoading = async () => {
      if (isShorts) {
        setExtractingStep(1);
        await new Promise((r) => setTimeout(r, 1500));
        setExtractingStep(2);
        await new Promise((r) => setTimeout(r, 1500));
        setExtractingStep(3);
      } else {
        setExtractingStep(0);
      }
    };
    runFakeLoading();

    try {
      const searchInstruction = isUrl
        ? "제공된 URL의 웹페이지를 검색하여 상품의 주요 특징, 스펙, 장점을 추출한 뒤 이를 바탕으로"
        : "제공된 상품명을 기반으로 웹 검색을 통해 특징 파악한 뒤 이를 바탕으로";

      let formatContext = "";
      let structureContext = "";

      if (isShorts) {
        formatContext =
          "너는 1분 이내로 시청자의 시선을 사로잡아야 하는 전문 숏폼 크리에이터야.";
        structureContext =
          "구조는 [후킹 (3초)], [핵심 소구점 (빠른 템포)], [콜투액션(CTA)] 세 파트로 나누고, 숏폼 트렌드에 맞게 간결하게 작성해.";
      } else if (scriptFormat.includes("롱폼")) {
        formatContext =
          "너는 고객이 상품을 구매하도록 설득하는 전문 상세페이지 기획자이자 파워블로거야.";
        structureContext =
          "구조는 [시선을 끄는 헤드카피], [고객의 페인포인트 공감], [상품 스펙 및 해결책 제시], [가치 제안 및 클로징] 네 파트로 나누고, 내용이 풍부하고 깊이있는 긴 글로 작성해.";
      } else {
        formatContext = "너는 전문 홈쇼핑 라이브커머스 작가야.";
        structureContext =
          "구조는 [오프닝], [상품 특징 요약], [활용 포인트 및 셀링포인트], [클로징] 네 파트로 나누고, 방송용으로 자연스럽게 작성해.";
      }

      let langInstruction = "반드시 자연스러운 한국어 구어체로 작성해.";
      if (selectedLanguage === "en")
        langInstruction =
          "MUST be written in natural spoken English. Do not use Korean.";
      if (selectedLanguage === "ja")
        langInstruction = "必ず自然な日本語の口語体で作成してください。";
      if (selectedLanguage === "zh")
        langInstruction = "必须用自然的中文口语编写。";

      const prompt = `${formatContext} ${searchInstruction} 고객의 구매 유도를 하는 매력적인 ${scriptFormat} 콘텐츠 대본/글을 작성해줘. 
      입력값: ${productUrl}
      ${structureContext} 반드시 '${scriptTone}' 느낌으로 작성해. ${langInstruction}
      대본의 진행자 이름은 '${currentAvatarName}'이야. 
      작성 시 시작 부분에서 "안녕하세요! 여러분의 쇼핑 호스트 ${currentAvatarName}입니다"처럼 꼭 자신의 이름을 부르며 자연스럽고 활기차게 인사해줘 (언어에 맞게 번역해서). "대본을 시작하겠습니다" 같은 기계적인 시스템 멘트는 절대 넣지 마. 중요: ** * 나 ** 같은 마크다운 기호를 절대 사용하지마.`;

      let extractedName = productUrl;
      if (isUrl) {
        const namePrompt = `다음 URL(${productUrl})에 해당하는 핵심 상품명(브랜드+모델명)을 15자 이내로 짧게 추론해줘. 웹 검색이 안되면 URL 도메인 이름이라도 대답해. 부가 설명 없이 딱 상품명만 대답해.`;
        try {
          extractedName = await generateText(
            namePrompt,
            false,
            customGeminiKey
          );
          extractedName = extractedName.replace(/["']/g, "").trim();
        } catch (e) {
          console.warn("상품명 추출 실패", e);
        }
      }
      setFetchedProductName(extractedName);

      const generatedScript = await generateText(prompt, true, customGeminiKey);

      // 마크다운(** 등) 기호 제거 방어 로직 추가
      const cleanScript = generatedScript.replace(/\*\*/g, "");
      setScript(cleanScript);
    } catch (e) {
      console.error("Script generation error:", e);
      setFetchedProductName(isUrl ? "프리미엄 상품 (Demo)" : productUrl);
      setScript(
        `[오류] 대본 생성 중 문제가 발생했습니다. (${e.message})\n직접 대본을 작성해 주세요.`
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayVOD = async () => {
    if (isPlayingVOD) {
      stopCurrentAudio();
      return;
    }

    if (!script) {
      alert("대본을 먼저 생성하거나 직접 작성해주세요!");
      return;
    }
    if (isRenderingVOD) return;

    stopCurrentAudio();
    setIsRenderingVOD(true);

    try {
      const voiceToUse =
        voiceOptions.find((v) => v.gender === currentAvatarGender)?.id ||
        "Aoede";

      const testText =
        "안녕하세요! 본 영상은 VOD 렌더링 미리보기 입니다. 목소리가 잘 들리시나요?";

      const audioUrl = await generateTTS(testText, voiceToUse, customGeminiKey);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onplay = () => {
        setIsRenderingVOD(false);
        setIsPlayingVOD(true);
      };
      audio.onended = () => {
        setIsPlayingVOD(false);
      };
      audio.play();
    } catch (e) {
      console.error("VOD TTS 오류:", e);
      alert(`제미나이 음성 렌더링에 실패했습니다. (${e.message})`);
      setIsRenderingVOD(false);
    }
  };

  const processRealtimeAI = async (userInput) => {
    stopCurrentAudio();
    setPipelineStep("llm_gen");

    const tempId = Date.now() + "_loading";
    setChatHistory((prev) => [
      ...prev,
      {
        id: tempId,
        user: `${currentAvatarName}`,
        text: "",
        type: "ai_loading",
      },
    ]);

    let aiResponse = "";
    try {
      let langInstruction = "한국어 구어체로 대답해.";
      if (selectedLanguage === "en")
        langInstruction = "Answer in natural spoken English.";
      if (selectedLanguage === "ja")
        langInstruction = "自然な日本語の口語体で答えて。";
      if (selectedLanguage === "zh") langInstruction = "用自然的中文口语回答。";

      const prompt = `너는 홈쇼핑 라이브 방송의 친근하고 센스 있는 쇼핑 호스트야. 너의 이름은 '${currentAvatarName}'이야. 현재 판매중인 상품은 '${
        fetchedProductName || productUrl
      }'이야. 
      시청자 질문: "${userInput}"
      지시사항: 실제 사람처럼 아주 자연스럽고 친절한 구어체로 2~3문장 정도 대답해. ${langInstruction} 이모지도 자연스럽게 1~2개 섞어줘.`;

      const rawAiResponse = await generateText(prompt, false, customGeminiKey);

      // 마크다운 기호 제거 방어 로직 추가
      aiResponse = rawAiResponse.replace(/\*\*/g, "");
    } catch (e) {
      aiResponse =
        selectedLanguage === "en"
          ? "Yes! You can get the live discount right now! ✨"
          : "네, 맞습니다! 지금 바로 라이브 혜택가로 만나보실 수 있어요. ✨";
    }

    setChatHistory((prev) =>
      prev.map((chat) =>
        chat.id === tempId
          ? {
              ...chat,
              user: `${currentAvatarName} (Host)`,
              text: aiResponse,
              type: "ai",
            }
          : chat
      )
    );

    setPipelineStep("tts_conv");
    let audioUrl = null;
    if (!useHeygen || avatarProvider !== "did") {
      try {
        audioUrl = await generateTTS(
          aiResponse,
          selectedVoice,
          customGeminiKey
        );
      } catch (e) {
        console.error("TTS Fallback", e);
      }
    }

    if (useHeygen && heygenStatus === "connected") {
      setPipelineStep("lipsync_render");
      setIsPlayingAudio(true);

      if (avatarProvider === "heygen" && heygenAvatarInstance.current) {
        try {
          await heygenAvatarInstance.current.speak({ text: aiResponse });
        } catch (e) {
          console.error("HeyGen Speak Error", e);
        }
      } else if (avatarProvider === "did" && peerConnectionRef.current) {
        const authHeader = `Basic ${
          didApiKey.includes(":") ? btoa(didApiKey) : didApiKey
        }`;
        try {
          await fetch(
            `https://api.d-id.com/talks/streams/${didStreamIdRef.current}`,
            {
              method: "POST",
              headers: {
                Authorization: authHeader,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                script: {
                  type: "text",
                  input: aiResponse,
                  provider: {
                    type: "microsoft",
                    voice_id: "ko-KR-SunHiNeural",
                  },
                },
                config: { fluent: true, pad_audio: 0 },
                session_id: didSessionIdRef.current,
              }),
            }
          );
        } catch (e) {
          console.error("D-ID Speak Error", e);
        }
      }

      setTimeout(() => {
        setIsPlayingAudio(false);
        setPipelineStep("idle");
      }, Math.max(aiResponse.length * 150, 3000));
    } else {
      setPipelineStep("lipsync_render");
      const finishPipeline = () => {
        setIsPlayingAudio(false);
        setPipelineStep("obs_push");
        setTimeout(() => setPipelineStep("idle"), 1000);
      };

      if (audioUrl) {
        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;

        audio.onplay = () => setIsPlayingAudio(true);
        audio.onended = () => finishPipeline();

        audio.play().catch((e) => {
          console.error("Audio playback failed:", e);
          finishPipeline();
        });
      } else {
        console.error("제미나이 TTS URL을 가져오지 못했습니다.");
        finishPipeline();
      }
    }
  };

  const handleSendChat = (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !isStreaming || pipelineStep !== "idle") return;
    setChatHistory((prev) => [
      ...prev,
      { id: Date.now(), user: "Guest", text: chatInput, type: "user" },
    ]);
    const input = chatInput;
    setChatInput("");
    processRealtimeAI(input);
  };

  const handlePurchase = () => {
    if (!isStreaming) {
      alert("방송을 시작(Start)한 후에 구매가 가능합니다!");
      return;
    }

    setLiveNotification(`🎉 Guest님이 라이브 단독 혜택으로 구매하셨습니다!`);

    setChatHistory((prev) => [
      ...prev,
      {
        id: Date.now(),
        user: "System",
        text: "🛍️ Guest님이 상품을 성공적으로 구매하셨습니다.",
        type: "system",
      },
    ]);

    processRealtimeAI(
      selectedLanguage === "en"
        ? "I just bought this item! React very happily and call my name (Guest)!"
        : "나 방금 이 상품 구매했어! 엄청 기뻐하면서 내 이름(Guest)을 부르며 격하게 리액션 해줘!"
    );
  };

  const handleDownloadScript = () => {
    if (!script) return;
    const blob = new Blob([script], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "host_script.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadVideo = () => {
    if (!script) return;
    setIsDownloadingVideo(true);

    setTimeout(() => {
      setIsDownloadingVideo(false);
      const blob = new Blob(
        [
          "이 파일은 데모용 가상 MP4 파일입니다. 실제 서비스에서는 AI로 렌더링된 MP4 영상 파일이 제공됩니다.",
        ],
        { type: "text/plain" }
      );
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const fileName = fetchedProductName
        ? `${fetchedProductName.replace(/\s/g, "_")}_VOD`
        : "AI_VOD_Video";

      a.download = `${fileName}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 2000);
  };

  useEffect(() => {
    const mainArea = document.getElementById("main-scroll-area");
    const imgEl = document.getElementById("vod-preview-img");
    const contentEl = document.getElementById("vod-hero-content");

    const handleScroll = () => {
      if (!mainArea || activeTab !== "create") return;
      const scrollY = mainArea.scrollTop;
      const progress = Math.min(1, scrollY / 600);
      if (imgEl) {
        imgEl.style.transform = `scale(${1 + progress * 0.15})`;
      }
      if (contentEl) {
        contentEl.style.opacity = Math.max(0, 1 - progress * 1.5).toString();
        contentEl.style.transform = `translateY(${progress * -60}px)`;
      }
    };

    if (mainArea) {
      mainArea.addEventListener("scroll", handleScroll, { passive: true });
      handleScroll();
    }
    return () => {
      if (mainArea) mainArea.removeEventListener("scroll", handleScroll);
    };
  }, [activeTab]);

  const handleTabChange = (id) => {
    setActiveTab(id);
    setIsMobileMenuOpen(false);
  };

  // --- Render Auth Screen If Not Logged In ---
  if (isAuthChecking) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0E1015]">
        <div className="flex flex-col items-center">
          <Loader2 className="w-10 h-10 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-400 font-medium">
            인증 정보를 확인하는 중...
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen bg-white font-sans selection:bg-blue-200 selection:text-blue-900">
        <div className="hidden lg:flex lg:w-[45%] xl:w-1/2 relative bg-[#0a0a0c] overflow-hidden items-center justify-center p-12">
          <img
            src="https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop"
            className="absolute inset-0 w-full h-full object-cover opacity-50 mix-blend-screen"
            alt="Background"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-[#0a0a0c]/80 to-transparent"></div>
          <div className="absolute inset-0 bg-blue-900/20 mix-blend-overlay"></div>

          <div className="relative z-10 w-full max-w-xl">
            <div className="w-14 h-14 bg-white/10 backdrop-blur-xl rounded-2xl flex items-center justify-center border border-white/20 mb-10 shadow-2xl">
              <Zap size={28} className="text-blue-400 fill-current" />
            </div>
            <h1 className="text-4xl xl:text-5xl font-extrabold tracking-tight mb-6 text-white leading-[1.2]">
              Next Generation <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 animate-gradient-x">
                AI Commerce Studio
              </span>
            </h1>
            <p className="text-lg text-gray-400 font-medium mb-12 leading-relaxed max-w-md">
              단 한 줄의 텍스트가 완성된 라이브 방송으로.
              <br />
              당신만의 완벽한 가상 쇼핑 호스트를 지금 바로 생성하고 송출해
              보세요.
            </p>

            <div className="flex items-center gap-4 p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 w-fit">
              <div className="flex -space-x-3">
                {avatars.map((a, i) => (
                  <img
                    key={i}
                    src={a.img}
                    className="w-10 h-10 rounded-full border-2 border-[#15161A] object-cover"
                    alt="user"
                  />
                ))}
              </div>
              <div className="text-sm font-medium text-gray-300">
                Join <strong className="text-white">10,000+</strong> global
                creators
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-6 sm:px-12 lg:px-20 xl:px-32 relative bg-white">
          <div className="w-full max-w-[420px] mx-auto relative z-10">
            <div className="lg:hidden w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg mb-8">
              <Zap size={24} className="text-white fill-current" />
            </div>

            <div key={authMode} className="animate-flipIn">
              <div className="mb-10">
                <h2 className="text-3xl font-extrabold text-gray-900 mb-3 tracking-tight">
                  {authMode === "login" ? "Welcome back" : "Create an account"}
                </h2>
                <p className="text-gray-500 font-medium text-[15px]">
                  {authMode === "login"
                    ? "이메일과 비밀번호를 입력하여 접속하세요."
                    : "Studio.ai에 가입하고 지금 바로 시작하세요."}
                </p>
              </div>

              <form onSubmit={handleAuthSubmit} className="space-y-6">
                <div className="space-y-5">
                  {authMode === "register" ? (
                    <div className="animate-fadeIn">
                      <label className="text-[13px] font-bold text-gray-700 block mb-2">
                        Full Name
                      </label>
                      <div className="relative group">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                          <User size={18} />
                        </div>
                        <input
                          type="text"
                          required={authMode === "register"}
                          className="w-full bg-gray-50 border border-gray-200 rounded-[1rem] py-4 pl-12 pr-4 text-[14px] font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all placeholder-gray-400"
                          placeholder="홍길동"
                          value={authName}
                          onChange={(e) => setAuthName(e.target.value)}
                        />
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <label className="text-[13px] font-bold text-gray-700 block mb-2">
                      Email address
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <Mail size={18} />
                      </div>
                      <input
                        type="email"
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-[1rem] py-4 pl-12 pr-4 text-[14px] font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all placeholder-gray-400"
                        placeholder="name@company.com"
                        value={authEmail}
                        onChange={(e) => setAuthEmail(e.target.value)}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[13px] font-bold text-gray-700 flex justify-between mb-2">
                      Password
                      {authMode === "login" ? (
                        <a
                          href="#"
                          className="text-blue-600 font-bold text-[12px] hover:underline"
                        >
                          Forgot?
                        </a>
                      ) : null}
                    </label>
                    <div className="relative group">
                      <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors">
                        <Lock size={18} />
                      </div>
                      <input
                        type="password"
                        required
                        className="w-full bg-gray-50 border border-gray-200 rounded-[1rem] py-4 pl-12 pr-4 text-[14px] font-medium text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 focus:bg-white transition-all placeholder-gray-400"
                        placeholder="••••••••"
                        value={authPassword}
                        onChange={(e) => setAuthPassword(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                {authError ? (
                  <div className="p-4 bg-red-50 text-red-600 rounded-[1rem] text-[13px] font-bold border border-red-100 flex items-start gap-3 animate-fadeIn">
                    <ShieldCheck
                      size={18}
                      className="shrink-0 mt-0.5 text-red-500"
                    />
                    <span className="leading-relaxed">{authError}</span>
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="w-full bg-gray-900 hover:bg-blue-600 text-white font-bold py-4 rounded-[1rem] shadow-xl shadow-gray-900/10 hover:shadow-blue-600/20 transition-all flex justify-center items-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 mt-2"
                >
                  {isAuthLoading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : null}
                  {authMode === "login" ? "Sign In" : "Create Account"}
                </button>
              </form>

              <div className="mt-6 relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500 font-medium">
                    또는
                  </span>
                </div>
              </div>

              <div className="mt-6">
                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isAuthLoading}
                  className="w-full flex justify-center items-center gap-3 py-3.5 px-4 border border-gray-200 rounded-[1rem] shadow-sm bg-white text-[14px] font-bold text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-4 focus:ring-gray-100 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  <svg viewBox="0 0 48 48" className="w-5 h-5">
                    <path
                      fill="#FFC107"
                      d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"
                    />
                    <path
                      fill="#FF3D00"
                      d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"
                    />
                    <path
                      fill="#4CAF50"
                      d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"
                    />
                    <path
                      fill="#1976D2"
                      d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"
                    />
                  </svg>
                  Google 계정으로 계속하기
                </button>
              </div>

              <div className="mt-10 pt-8 border-t border-gray-100 text-center">
                <p className="text-[14px] text-gray-500 font-medium">
                  {authMode === "login"
                    ? "Don't have an account?"
                    : "Already have an account?"}{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode(authMode === "login" ? "register" : "login");
                      setAuthError("");
                      setAuthName("");
                      setAuthPassword("");
                    }}
                    className="text-blue-600 font-extrabold hover:text-blue-700 transition-colors"
                  >
                    {authMode === "login" ? "Sign up now" : "Log in"}
                  </button>
                </p>
              </div>
            </div>

            <div className="mt-8 flex justify-center items-center gap-2 text-[11px] text-gray-400 font-medium relative z-10">
              <Lock size={12} /> Secured by Firebase Auth
            </div>
          </div>
        </div>
      </div>
    );
  }

  const SidebarItem = ({ id, icon: Icon, label, badge }) => (
    <button
      onClick={() => handleTabChange(id)}
      className={`flex items-center w-full px-4 py-3 rounded-2xl transition-all duration-300 group relative overflow-hidden ${
        activeTab === id
          ? "bg-gradient-to-r from-blue-600/10 to-transparent text-white border border-blue-500/20"
          : "text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent"
      }`}
    >
      {activeTab === id && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]"></div>
      )}
      <Icon
        size={18}
        className={`mr-3 transition-colors duration-300 ${
          activeTab === id
            ? "text-blue-400"
            : "text-gray-500 group-hover:text-gray-300"
        }`}
      />
      <span
        className={`text-[14px] font-medium tracking-wide ${
          activeTab === id ? "font-semibold" : ""
        }`}
      >
        {label}
      </span>
      {badge && (
        <span
          className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-bold tracking-wider uppercase ${
            activeTab === id
              ? "bg-blue-500/20 text-blue-300 border border-blue-500/30"
              : "bg-white/10 text-gray-400"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );

  const isVerticalView =
    scriptFormat.includes("쇼츠") || scriptFormat.includes("릴스");

  return (
    <div className="flex h-screen bg-[#F5F7FA] text-gray-900 font-sans antialiased overflow-hidden selection:bg-blue-200 selection:text-blue-900">
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* 사이드바 */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-[280px] bg-[#0E1015] border-r border-gray-800/50 flex flex-col p-6 shadow-2xl transition-transform duration-300 ease-in-out md:relative md:translate-x-0 shrink-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          className="md:hidden absolute top-6 right-6 text-gray-400 hover:text-white z-50"
          onClick={() => setIsMobileMenuOpen(false)}
        >
          <X size={24} />
        </button>
        <div className="absolute top-0 left-0 w-full h-64 bg-blue-600/5 blur-[100px] pointer-events-none"></div>

        <div className="flex items-center gap-3 mb-12 px-2 mt-2 group relative z-10">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(59,130,246,0.3)] group-hover:shadow-[0_0_25px_rgba(59,130,246,0.5)] transition-all duration-300 transform group-hover:-translate-y-0.5">
            <Zap size={20} className="text-white fill-current" />
          </div>
          <h1 className="text-[22px] font-bold tracking-tight text-white font-['Plus_Jakarta_Sans']">
            Studio<span className="text-blue-400">.ai</span>
          </h1>
        </div>

        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4 px-3 relative z-10">
          Workspaces
        </div>
        <div className="space-y-2 mb-10 relative z-10">
          <SidebarItem
            id="dashboard"
            icon={LayoutDashboard}
            label="Dashboard"
          />
          <SidebarItem id="create" icon={Video} label="VOD Studio" />
          <SidebarItem
            id="live"
            icon={Radio}
            label="Live Engine"
            badge="BETA"
          />
          <SidebarItem id="assets" icon={Layers} label="Brand Assets" />
        </div>

        <div className="text-[11px] font-bold text-gray-500 uppercase tracking-widest mb-4 px-3 relative z-10">
          Preferences
        </div>
        <div className="space-y-2 relative z-10">
          <SidebarItem id="settings" icon={Settings} label="Settings" />
          <SidebarItem id="faq" icon={HelpCircle} label="Help & Support" />
        </div>

        {/* --- 사이드바 하단 프리미엄 구독 영역 --- */}
        <div
          onClick={() => !isPremium && setShowPremiumModal(true)}
          className={`mt-auto p-5 backdrop-blur-md rounded-[1.5rem] border relative overflow-hidden group transition-all z-10 ${
            isPremium
              ? "bg-gradient-to-br from-gray-900 to-[#0a0a0c] border-amber-500/30 cursor-default shadow-[0_0_15px_rgba(251,191,36,0.1)]"
              : "bg-white/5 border-white/10 hover:border-amber-500/30 cursor-pointer"
          }`}
        >
          <div
            className={`absolute top-0 right-0 w-32 h-32 rounded-full blur-2xl -z-10 transition-opacity ${
              isPremium
                ? "bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-100"
                : "bg-gradient-to-br from-amber-500/10 to-orange-500/10 opacity-0 group-hover:opacity-100"
            }`}
          ></div>

          <div className="flex items-center gap-3 mb-4 z-10 relative">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm border shadow-inner transition-colors ${
                isPremium
                  ? "bg-gradient-to-tr from-amber-500/20 to-amber-600/20 border-amber-500/50 text-amber-400"
                  : "bg-gradient-to-tr from-gray-800 to-gray-700 border-gray-600 text-gray-400 group-hover:text-amber-400 group-hover:border-amber-500/50"
              }`}
            >
              <Crown size={18} />
            </div>
            <div>
              <p className="text-[14px] font-bold text-white tracking-tight">
                {isPremium ? "Studio.ai PRO" : "Free Plan"}
              </p>
              <div
                className={`text-[11px] font-medium tracking-wide flex items-center gap-1 ${
                  isPremium ? "text-amber-400" : "text-gray-400"
                }`}
              >
                {isPremium ? (
                  <>
                    <CheckCircle2 size={10} /> All features unlocked
                  </>
                ) : (
                  "Upgrade for more"
                )}
              </div>
            </div>
          </div>
          {!isPremium && (
            <button className="w-full py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl text-[13px] font-bold transition-all backdrop-blur-sm active:scale-95 shadow-lg">
              Upgrade to PRO
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative bg-[#F5F7FA] w-full">
        <header className="h-[60px] md:h-[80px] px-4 md:px-10 flex justify-between items-center bg-white/70 backdrop-blur-xl border-b border-gray-200/60 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="flex items-center gap-2 md:gap-3 text-[12px] md:text-[14px] font-medium text-gray-500">
              <span className="hidden sm:inline hover:text-gray-900 transition-colors cursor-pointer">
                AI Workspace
              </span>
              <ChevronRight
                size={16}
                className="text-gray-300 hidden sm:inline"
              />
              <span className="text-gray-900 font-bold tracking-tight">
                {activeTab === "create"
                  ? "Create New Campaign"
                  : activeTab === "live"
                  ? "Live Streaming Simulator"
                  : activeTab === "dashboard"
                  ? "Global Dashboard"
                  : activeTab === "assets"
                  ? "Brand Assets"
                  : activeTab === "settings"
                  ? "Preferences"
                  : "Help & Support"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 md:gap-6">
            {isPremium && (
              <div className="hidden sm:flex items-center gap-1.5 bg-gray-900 text-amber-400 px-3 py-1.5 md:px-4 md:py-2 rounded-full font-bold text-[11px] md:text-[13px] shadow-sm border border-amber-500/30">
                <Crown size={16} /> PRO Active
              </div>
            )}

            <div className="flex items-center gap-2 md:gap-3 px-3 py-1.5 md:px-4 md:py-2 bg-white border border-gray-200/80 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
              <div
                className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${
                  isStreaming
                    ? "bg-[#FF4F4F] shadow-[0_0_10px_rgba(255,79,79,0.5)] animate-pulse"
                    : "bg-gray-300"
                }`}
              ></div>
              <span className="text-[9px] md:text-[11px] font-bold text-gray-600 tracking-widest uppercase hidden sm:inline">
                {isStreaming ? `${avatarProvider} ACTIVE` : "SYSTEM IDLE"}
              </span>
            </div>
            <div className="h-6 w-[1px] bg-gray-200 hidden sm:block"></div>
            <button className="text-gray-400 hover:text-blue-600 transition-colors relative bg-white p-2 rounded-full border border-gray-100 shadow-sm hover:shadow-md hidden sm:block">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-blue-500 rounded-full border border-white"></span>
            </button>

            {/* User Profile Area */}
            <div className="group relative">
              <div className="flex items-center gap-3 cursor-pointer p-1 pr-3 rounded-full hover:bg-white transition-colors">
                <div className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold overflow-hidden ring-2 ring-white shadow-md">
                  {user?.email ? (
                    user.email.charAt(0).toUpperCase()
                  ) : (
                    <User size={18} />
                  )}
                </div>
                <div className="hidden md:block">
                  <p className="text-[12px] font-bold text-gray-900 truncate max-w-[100px]">
                    {user?.email || "Guest"}
                  </p>
                  <p className="text-[10px] font-medium text-gray-500 uppercase">
                    Creator
                  </p>
                </div>
              </div>

              {/* Dropdown Menu */}
              <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-gray-100 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right group-hover:translate-y-0 translate-y-2">
                <div className="p-3 border-b border-gray-100">
                  <p className="text-[11px] text-gray-500 font-bold uppercase tracking-wider mb-1">
                    Signed in as
                  </p>
                  <p className="text-[13px] text-gray-900 font-medium truncate">
                    {user?.email}
                  </p>
                </div>
                <div className="p-2">
                  <button
                    onClick={handleSignOut}
                    className="w-full text-left px-3 py-2 text-[13px] font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                  >
                    <LogOut size={16} /> 로그아웃
                  </button>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* 메인 스크롤 영역 */}
        <main
          id="main-scroll-area"
          className="flex-1 overflow-y-auto relative custom-scrollbar bg-[#F5F7FA]"
        >
          {/* CREATE TAB - VOD STUDIO */}
          {activeTab === "create" && (
            <div className="flex flex-col relative bg-[#0a0a0c] animate-fadeIn">
              <div className="sticky top-0 h-[calc(100vh-60px)] md:h-[calc(100vh-80px)] w-full overflow-hidden flex flex-col items-center justify-center z-0 bg-black/95">
                <div
                  className={`transition-all duration-1000 ease-in-out relative flex items-center justify-center overflow-hidden
                  ${
                    isVerticalView
                      ? "w-full max-w-[360px] md:max-w-[400px] aspect-[9/16] max-h-[85vh] rounded-[2rem] md:rounded-[3rem] shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10"
                      : "w-full h-full"
                  }`}
                >
                  <img
                    id="vod-preview-img"
                    src={
                      avatars.find((a) => a.id === selectedAvatar)?.img ||
                      avatars[0].img
                    }
                    className={`w-full h-full object-cover transition-all duration-1000 origin-center ${
                      extractingStep > 0 && extractingStep < 3
                        ? "scale-110 filter blur-[2px]"
                        : ""
                    }`}
                    alt="VOD Preview"
                  />

                  {extractingStep > 0 && extractingStep < 3 ? (
                    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
                      <Focus className="w-16 h-16 text-blue-500 animate-spin-slow mb-6 opacity-80" />
                      <div className="bg-white/10 px-6 py-3 rounded-full border border-white/20 flex items-center gap-3 backdrop-blur-md">
                        <div className="w-4 h-4 rounded-full bg-blue-500 animate-ping"></div>
                        <span className="text-white font-bold tracking-widest text-sm">
                          {extractingStep === 1
                            ? "ANALYZING HIGHLIGHTS..."
                            : "CROPPING TO 9:16..."}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  <div
                    className={`absolute inset-0 bg-gradient-to-t from-[#0a0a0c] via-transparent to-black/30 pointer-events-none transition-opacity ${
                      extractingStep > 0 && extractingStep < 3
                        ? "opacity-0"
                        : "opacity-100"
                    }`}
                  ></div>

                  <div
                    id="vod-hero-content"
                    className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-75 will-change-transform z-10 ${
                      extractingStep > 0 && extractingStep < 3
                        ? "opacity-0 scale-95"
                        : "opacity-100 scale-100"
                    }`}
                  >
                    <div
                      onClick={handlePlayVOD}
                      className="relative w-16 h-16 md:w-24 md:h-24 bg-white/10 backdrop-blur-xl rounded-full flex items-center justify-center border border-white/20 text-white cursor-pointer hover:bg-white hover:text-blue-500 transition-all shadow-2xl hover:scale-110 mb-8 md:mb-10 z-10"
                    >
                      {isRenderingVOD ? (
                        <svg
                          className="animate-spin w-8 h-8 md:w-10 md:h-10 text-white"
                          viewBox="0 0 24 24"
                        >
                          <circle
                            className="opacity-20"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="3"
                            fill="none"
                          ></circle>
                          <path
                            className="opacity-100"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          ></path>
                        </svg>
                      ) : isPlayingVOD ? (
                        <Square
                          size={36}
                          className="fill-current w-8 h-8 md:w-10 md:h-10 text-red-500"
                        />
                      ) : (
                        <Play
                          size={36}
                          className="ml-1 md:ml-2 fill-current w-8 h-8 md:w-10 md:h-10"
                        />
                      )}
                    </div>

                    {!isVerticalView ? (
                      <div className="absolute bottom-10 md:bottom-20 inset-x-4 md:inset-x-10 z-10 flex justify-center">
                        <div className="bg-black/40 backdrop-blur-md px-5 py-3 md:px-8 md:py-4 rounded-full border border-white/10 shadow-2xl text-center flex items-center gap-3 transition-all">
                          {script ? (
                            <>
                              <CheckCircle2
                                size={18}
                                className="text-emerald-400"
                              />
                              <p className="text-[13px] md:text-[15px] text-white/90 font-medium">
                                ✨ AI 대본 생성 완료 (하단 스크립트 에디터에서
                                내용 확인)
                              </p>
                            </>
                          ) : (
                            <>
                              <Sparkles size={18} className="text-blue-400" />
                              <p className="text-[13px] md:text-[15px] text-white/90 font-medium">
                                아래 스튜디오 워크스페이스에서 포맷을 선택하고
                                콘텐츠를 생성하세요.
                              </p>
                            </>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>

                  {isVerticalView &&
                  extractingStep !== 1 &&
                  extractingStep !== 2 ? (
                    <div className="absolute right-4 bottom-20 flex flex-col gap-4 z-10 animate-fadeIn">
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <Heart size={20} className="text-white" />
                      </div>
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <MessageSquare size={20} className="text-white" />
                      </div>
                      <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                        <Share2 size={20} className="text-white" />
                      </div>
                    </div>
                  ) : null}
                </div>

                {isVerticalView ? (
                  <div className="absolute top-6 flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full border border-white/20 text-white text-sm font-bold z-10 animate-fadeIn">
                    <Crop size={16} className="text-blue-400" />
                    AI Auto-Framed (9:16)
                  </div>
                ) : null}
              </div>

              <div className="relative z-20 bg-[#F5F7FA] rounded-t-[2rem] md:rounded-t-[3rem] shadow-[0_-30px_60px_rgba(0,0,0,0.5)] p-4 sm:p-8 lg:p-12 min-h-screen border-t border-white/10">
                <div className="max-w-[1400px] mx-auto space-y-6 md:space-y-8">
                  <section className="bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col xl:flex-row gap-6 items-center">
                    <div className="flex-1 w-full">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                        <div>
                          <h3 className="text-[16px] md:text-[18px] font-bold text-gray-900 mb-2 flex items-center gap-2">
                            <Sparkles className="text-blue-500" size={20} />{" "}
                            멀티 플랫폼 콘텐츠 생성 & AI 편집
                          </h3>
                          <p className="text-gray-500 text-[13px] md:text-[14px] font-medium">
                            원하시는 플랫폼과 언어를 선택하세요. 글로벌 숏폼
                            콘텐츠도 단숨에 완성됩니다.
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col xl:flex-row gap-3 mb-6">
                        <div className="flex flex-wrap bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                          {formatOptions.map((format) => (
                            <button
                              key={format}
                              onClick={() => setScriptFormat(format)}
                              className={`px-3 md:px-4 py-2 text-[12px] md:text-[13px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                                scriptFormat === format
                                  ? "bg-white text-blue-600 shadow-sm border border-gray-100"
                                  : "text-gray-500 hover:text-gray-700"
                              }`}
                            >
                              {format.includes("쇼츠") ||
                              format.includes("릴스") ? (
                                <Smartphone
                                  size={14}
                                  className={
                                    scriptFormat === format
                                      ? "text-blue-500"
                                      : ""
                                  }
                                />
                              ) : format.includes("롱폼") ? (
                                <FileText size={14} />
                              ) : (
                                <Video size={14} />
                              )}
                              {format}
                            </button>
                          ))}
                        </div>
                        <div className="hidden xl:block w-[1px] bg-gray-200 mx-1"></div>

                        {/* --- 글로벌 언어팩 선택 UI (PRO 기능) --- */}
                        <div className="flex flex-wrap bg-gray-50 p-1.5 rounded-xl border border-gray-200">
                          <button
                            onClick={() => handleLanguageSelect("ko")}
                            className={`px-3 md:px-4 py-2 text-[12px] md:text-[13px] font-bold rounded-lg transition-all flex items-center gap-1.5 ${
                              selectedLanguage === "ko"
                                ? "bg-white text-blue-600 shadow-sm border border-gray-100"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            한국어
                          </button>
                          <button
                            onClick={() => handleLanguageSelect("en")}
                            className={`px-3 md:px-4 py-2 text-[12px] md:text-[13px] font-bold rounded-lg transition-all flex items-center gap-1.5 relative ${
                              selectedLanguage === "en"
                                ? "bg-white text-blue-600 shadow-sm border border-gray-100"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            English{" "}
                            {!isPremium ? (
                              <Crown
                                size={12}
                                className="text-amber-400 absolute top-1 right-1"
                              />
                            ) : null}
                          </button>
                          <button
                            onClick={() => handleLanguageSelect("ja")}
                            className={`px-3 md:px-4 py-2 text-[12px] md:text-[13px] font-bold rounded-lg transition-all flex items-center gap-1.5 relative ${
                              selectedLanguage === "ja"
                                ? "bg-white text-blue-600 shadow-sm border border-gray-100"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            日本語{" "}
                            {!isPremium ? (
                              <Crown
                                size={12}
                                className="text-amber-400 absolute top-1 right-1"
                              />
                            ) : null}
                          </button>
                          <button
                            onClick={() => handleLanguageSelect("zh")}
                            className={`px-3 md:px-4 py-2 text-[12px] md:text-[13px] font-bold rounded-lg transition-all flex items-center gap-1.5 relative ${
                              selectedLanguage === "zh"
                                ? "bg-white text-blue-600 shadow-sm border border-gray-100"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            中文{" "}
                            {!isPremium ? (
                              <Crown
                                size={12}
                                className="text-amber-400 absolute top-1 right-1"
                              />
                            ) : null}
                          </button>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row p-2 bg-gray-50 border border-gray-200 rounded-[1.5rem] md:rounded-full focus-within:bg-white focus-within:border-blue-500 focus-within:shadow-[0_0_20px_rgba(59,130,246,0.1)] transition-all items-center gap-3 sm:gap-0">
                        <div className="hidden sm:block pl-5 pr-3 text-gray-400">
                          <Link size={18} />
                        </div>
                        <input
                          type="text"
                          className="w-full sm:flex-1 bg-transparent border-none px-4 py-3 sm:py-3 sm:px-0 text-[14px] md:text-[15px] outline-none text-gray-800 placeholder-gray-400 font-medium text-center sm:text-left"
                          placeholder="상품명 입력 또는 연동할 스토어 URL 붙여넣기..."
                          value={productUrl}
                          onChange={(e) => {
                            setProductUrl(e.target.value);
                            setFetchedProductName("");
                          }}
                        />
                        <button
                          onClick={handleGenerateScript}
                          disabled={isGenerating}
                          className={`w-full sm:w-auto text-white px-8 py-3.5 rounded-xl md:rounded-full font-bold text-[13px] md:text-[14px] transition-all shadow-md flex items-center justify-center gap-2 disabled:bg-gray-300 ${
                            isVerticalView
                              ? "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500"
                              : "bg-gray-900 hover:bg-blue-600"
                          }`}
                        >
                          {isGenerating ? (
                            "AI 분석 중..."
                          ) : isVerticalView ? (
                            <>
                              <Scissors size={16} /> 쇼츠 자동 생성
                            </>
                          ) : (
                            "대본 자동 생성"
                          )}
                        </button>
                      </div>
                    </div>
                  </section>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                    <div className="lg:col-span-5 xl:col-span-4 bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[16px] md:text-[17px] font-bold text-gray-900 flex items-center gap-2">
                          <span className="p-2 bg-blue-50 text-blue-600 rounded-xl block">
                            <Users size={18} />
                          </span>
                          Host Persona
                        </h3>
                        <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                          {avatars.find((a) => a.id === selectedAvatar)
                            ?.style || "커스텀"}{" "}
                          룩
                        </span>
                      </div>

                      {/* --- 아바타 그리드 (커스텀 아바타 추가) --- */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {avatars.map((avatar) => (
                          <button
                            key={avatar.id}
                            onClick={() => setSelectedAvatar(avatar.id)}
                            className={`relative aspect-square rounded-2xl overflow-hidden transition-all duration-300 ${
                              selectedAvatar === avatar.id
                                ? "ring-2 md:ring-4 ring-blue-500 shadow-lg scale-100"
                                : "scale-[0.96] opacity-60 grayscale-[0.5] hover:scale-100 hover:opacity-100 hover:grayscale-0"
                            }`}
                          >
                            <img
                              src={avatar.img}
                              alt={avatar.name}
                              className="absolute inset-0 w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-transparent to-transparent pointer-events-none"></div>

                            <div
                              onClick={(e) => handlePreviewVoice(e, avatar)}
                              className="absolute top-1.5 left-1.5 md:top-2 md:left-2 bg-black/40 hover:bg-black/80 rounded-full p-1.5 md:p-2 backdrop-blur-md transition-colors z-20"
                              title="목소 미리듣기"
                            >
                              {previewingAvatar === avatar.id ? (
                                isPreviewLoading ? (
                                  <Loader2
                                    size={12}
                                    className="text-white animate-spin md:w-[14px] md:h-[14px]"
                                  />
                                ) : (
                                  <Square
                                    size={12}
                                    className="text-red-400 md:w-[14px] md:h-[14px]"
                                    fill="currentColor"
                                  />
                                )
                              ) : (
                                <Volume2
                                  size={12}
                                  className="text-white md:w-[14px] md:h-[14px]"
                                />
                              )}
                            </div>

                            {selectedAvatar === avatar.id ? (
                              <div className="absolute top-1.5 right-1.5 bg-blue-500 rounded-full p-0.5 shadow-md">
                                <CheckCircle2
                                  size={14}
                                  className="text-white"
                                />
                              </div>
                            ) : null}

                            <div className="absolute inset-x-0 bottom-2 md:bottom-3 flex flex-col items-center pointer-events-none">
                              <span className="text-[11px] md:text-[13px] text-white font-bold drop-shadow-md">
                                {avatar.name.split(" ")[0]}
                              </span>
                            </div>
                          </button>
                        ))}

                        {/* --- 커스텀 아바타 (PRO 전용) 버튼 --- */}
                        <button
                          onClick={() => {
                            if (!isPremium) setShowPremiumModal(true);
                            else
                              alert(
                                "커스텀 아바타 스튜디오 기능이 준비 중입니다. (Enterprise API 연동 필요)"
                              );
                          }}
                          className="relative aspect-square rounded-2xl overflow-hidden border-2 border-dashed border-gray-300 hover:border-amber-400 hover:bg-amber-50 bg-gray-50 flex flex-col items-center justify-center transition-all group"
                        >
                          <span className="bg-white p-2.5 rounded-full mb-1 group-hover:scale-110 group-hover:bg-amber-100 transition-all shadow-sm flex">
                            <Plus
                              size={18}
                              className="text-gray-500 group-hover:text-amber-600"
                            />
                          </span>
                          <span className="text-[11px] font-bold text-gray-500 group-hover:text-amber-700 block">
                            커스텀 생성
                          </span>
                          {!isPremium ? (
                            <span className="absolute top-1.5 right-1.5 flex">
                              <Crown
                                size={14}
                                className="text-amber-400 drop-shadow-sm"
                              />
                            </span>
                          ) : null}
                        </button>
                      </div>
                    </div>

                    <div className="lg:col-span-7 xl:col-span-8 bg-white p-6 md:p-8 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col">
                      <div className="flex justify-between items-center mb-6">
                        <h3 className="text-[16px] md:text-[17px] font-bold text-gray-900 flex items-center gap-2">
                          <span className="p-2 bg-purple-50 text-purple-600 rounded-xl block">
                            <MonitorPlay size={18} />
                          </span>
                          {scriptFormat} Script Editor
                        </h3>

                        <div className="flex items-center gap-2">
                          {script ? (
                            <>
                              <button
                                onClick={handleDownloadVideo}
                                disabled={isDownloadingVideo}
                                className="text-[11px] md:text-[12px] text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors shadow-sm disabled:opacity-50"
                              >
                                {isDownloadingVideo ? (
                                  <Loader2 size={14} className="animate-spin" />
                                ) : (
                                  <Download size={14} />
                                )}
                                영상 다운로드
                              </button>

                              <button
                                onClick={handleDownloadScript}
                                className="text-[11px] md:text-[12px] text-gray-500 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-colors"
                              >
                                <Download size={14} /> 텍스트 저장
                              </button>
                            </>
                          ) : null}
                        </div>
                      </div>
                      <textarea
                        className="w-full flex-1 min-h-[250px] md:min-h-[280px] bg-gray-50/50 border border-gray-200 rounded-2xl p-5 md:p-6 text-[14px] md:text-[15px] leading-loose text-gray-700 focus:outline-none focus:bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-500/10 transition-all resize-none custom-scrollbar placeholder-gray-400 font-medium shadow-inner"
                        value={script}
                        onChange={(e) => setScript(e.target.value)}
                        placeholder="상단에 상품명 또는 URL을 입력하시면 AI가 맞춤형 대본을 작성해 줍니다."
                      />

                      <button
                        onClick={handlePlayVOD}
                        disabled={isRenderingVOD || !script}
                        className={`mt-4 md:mt-6 w-full py-3.5 md:py-4 text-white rounded-xl md:rounded-2xl text-[13px] md:text-[14px] font-bold transition-all duration-300 shadow-md flex items-center justify-center gap-2 disabled:bg-gray-300 ${
                          isPlayingVOD
                            ? "bg-red-500 hover:bg-red-600"
                            : "bg-gray-900 hover:bg-blue-600"
                        }`}
                      >
                        {isRenderingVOD ? (
                          <>
                            <Loader2
                              size={18}
                              className="animate-spin text-white"
                            />{" "}
                            렌더링 중...
                          </>
                        ) : isPlayingVOD ? (
                          <>
                            <Square size={18} fill="currentColor" /> 재생 중지
                          </>
                        ) : (
                          <>
                            <Video size={18} /> Render Final Video (들어보기)
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* LIVE ENGINE TAB */}
          {activeTab === "live" && (
            <div className="p-4 sm:p-8 lg:p-10 flex flex-col xl:flex-row xl:items-start gap-6 md:gap-8 max-w-[1800px] mx-auto min-h-[calc(100vh-60px)] md:min-h-[calc(100vh-80px)] animate-fadeIn">
              {/* Left Controls */}
              <div className="w-full xl:w-[380px] flex flex-col gap-6 md:gap-8 shrink-0 xl:sticky xl:top-[100px]">
                <div className="bg-white p-6 md:p-8 pb-8 md:pb-10 rounded-[1.5rem] md:rounded-[2rem] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-bl from-blue-50 to-transparent rounded-bl-full pointer-events-none"></div>

                  <div className="flex justify-between items-center mb-6 md:mb-8 relative z-10">
                    <h3 className="text-[16px] md:text-[18px] font-bold text-gray-900 tracking-tight">
                      Engine Controls
                    </h3>
                    <button
                      onClick={() => {
                        if (isStreaming) {
                          setIsStreaming(false);
                          stopCurrentAudio();
                          setPipelineStep("idle");
                        } else {
                          setIsStreaming(true);
                        }
                      }}
                      className={`px-4 py-2.5 md:px-6 md:py-3 rounded-xl text-[11px] md:text-[12px] font-bold transition-all duration-300 shadow-sm flex items-center gap-1.5 md:gap-2 ${
                        isStreaming
                          ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100"
                          : "bg-gray-900 text-white hover:bg-blue-600"
                      }`}
                    >
                      {isStreaming ? (
                        <>
                          <Square size={14} fill="currentColor" /> Stop
                        </>
                      ) : (
                        <>
                          <Radio size={14} /> Start
                        </>
                      )}
                    </button>
                  </div>

                  {/* 라이브 엔진 내 다국어 언어팩 컨트롤 */}
                  <div className="space-y-3 md:space-y-4 mb-4 relative z-30">
                    <label className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Globe size={14} /> Language Pack (Streaming)
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleLanguageSelect("ko")}
                        className={`flex-1 py-2.5 text-[12px] font-bold rounded-lg border transition-all ${
                          selectedLanguage === "ko"
                            ? "bg-blue-50 text-blue-600 border-blue-200 shadow-sm"
                            : "bg-white text-gray-500 border-gray-200"
                        }`}
                      >
                        한국어
                      </button>
                      <button
                        onClick={() => handleLanguageSelect("en")}
                        className={`flex-1 relative py-2.5 text-[12px] font-bold rounded-lg border transition-all ${
                          selectedLanguage === "en"
                            ? "bg-blue-50 text-blue-600 border-blue-200 shadow-sm"
                            : "bg-white text-gray-500 border-gray-200"
                        }`}
                      >
                        EN{" "}
                        {!isPremium ? (
                          <Crown
                            size={10}
                            className="absolute top-1 right-1 text-amber-400"
                          />
                        ) : null}
                      </button>
                      <button
                        onClick={() => handleLanguageSelect("ja")}
                        className={`flex-1 relative py-2.5 text-[12px] font-bold rounded-lg border transition-all ${
                          selectedLanguage === "ja"
                            ? "bg-blue-50 text-blue-600 border-blue-200 shadow-sm"
                            : "bg-white text-gray-500 border-gray-200"
                        }`}
                      >
                        JP{" "}
                        {!isPremium ? (
                          <Crown
                            size={10}
                            className="absolute top-1 right-1 text-amber-400"
                          />
                        ) : null}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 md:space-y-4 mb-4 relative z-20">
                    <label className="text-[10px] md:text-[11px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                      <Mic size={14} /> Voice Model
                    </label>
                    <div className="relative">
                      <button
                        onClick={() => setIsVoiceMenuOpen(!isVoiceMenuOpen)}
                        className="w-full p-3.5 md:p-4 bg-gray-50 border border-gray-200 rounded-xl md:rounded-2xl text-[13px] md:text-[14px] font-semibold text-gray-800 flex justify-between items-center outline-none focus:ring-2 focus:ring-blue-500/20 transition-all shadow-sm"
                      >
                        <span className="truncate pr-2">
                          {voiceOptions.find((v) => v.id === selectedVoice)
                            ?.label || "목소리 선택"}
                        </span>
                        <ChevronDown
                          size={18}
                          className={`text-gray-400 transition-transform ${
                            isVoiceMenuOpen ? "rotate-180" : ""
                          }`}
                        />
                      </button>

                      {isVoiceMenuOpen ? (
                        <div className="absolute top-full left-0 w-full mt-2 bg-white border border-gray-100 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] overflow-hidden z-50 animate-fadeIn">
                          <div className="max-h-64 overflow-y-auto custom-scrollbar p-2 space-y-1">
                            {filteredVoices.map((v) => (
                              <button
                                key={v.id}
                                onClick={() => {
                                  setSelectedVoice(v.id);
                                  setIsVoiceMenuOpen(false);
                                }}
                                className={`w-full flex items-center justify-between p-3.5 rounded-lg transition-colors ${
                                  selectedVoice === v.id
                                    ? "bg-blue-50 text-blue-700 font-bold"
                                    : "hover:bg-gray-50 text-gray-700 font-medium"
                                }`}
                              >
                                <span className="text-[13px]">{v.label}</span>
                                {selectedVoice === v.id ? (
                                  <CheckCircle2
                                    size={16}
                                    className="text-blue-500"
                                  />
                                ) : null}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>

                  {/* API Toggle */}
                  <div className="relative z-10 flex flex-col gap-2">
                    <div className="flex items-center justify-between bg-blue-50 p-3 rounded-xl border border-blue-100">
                      <div className="flex items-center gap-2">
                        <VideoIcon size={16} className="text-blue-600" />
                        <span className="text-[12px] font-bold text-blue-900">
                          {avatarProvider.toUpperCase()} Real-time API
                        </span>
                      </div>
                      <button
                        onClick={() => {
                          if (avatarProvider === "did" && !didApiKey) {
                            alert(
                              "백엔드 시스템을 통한 D-ID 연동이 필요합니다."
                            );
                            return;
                          }
                          setUseHeygen(!useHeygen);
                        }}
                        className={`w-10 h-5 rounded-full relative transition-colors ${
                          useHeygen ? "bg-blue-600" : "bg-gray-300"
                        }`}
                      >
                        <div
                          className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-transform ${
                            useHeygen
                              ? "translate-x-5.5 left-0.5"
                              : "translate-x-0.5 left-0"
                          }`}
                          style={{
                            transform: useHeygen
                              ? "translateX(20px)"
                              : "translateX(2px)",
                          }}
                        ></div>
                      </button>
                    </div>
                  </div>

                  {/* 복원된 단계별 체크 (시각적 진행 상태) UI (STOP 상태에서도 항상 표시) */}
                  <div className="mt-6 bg-gray-50/50 rounded-2xl p-5 border border-gray-100 shadow-sm relative z-10 animate-fadeIn">
                    <h4 className="text-[12px] font-bold text-gray-900 mb-4 flex items-center gap-2">
                      <Activity
                        size={16}
                        className={
                          isStreaming ? "text-blue-500" : "text-gray-400"
                        }
                      />
                      {useHeygen ? "Connection Progress" : "Engine Status"}
                    </h4>

                    {useHeygen ? (
                      <div className="space-y-4 relative before:absolute before:inset-y-0 before:left-[11px] before:w-0.5 before:bg-gray-200">
                        {progressSteps.map((step) => {
                          const isCompleted =
                            connectionStep > step.id ||
                            (connectionStep === 4 && step.id === 4);
                          const isCurrent =
                            isStreaming && connectionStep === step.id;
                          return (
                            <div
                              key={step.id}
                              className="relative flex items-center gap-3"
                            >
                              <div
                                className={`w-6 h-6 rounded-full flex items-center justify-center relative z-10 transition-all duration-300 ${
                                  isCompleted
                                    ? "bg-blue-500 text-white"
                                    : isCurrent
                                    ? "bg-white border-2 border-blue-500"
                                    : "bg-white border-2 border-gray-300"
                                }`}
                              >
                                {isCompleted ? (
                                  <CheckCircle2
                                    size={14}
                                    className="animate-fadeIn"
                                  />
                                ) : isCurrent ? (
                                  <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
                                ) : null}
                              </div>
                              <span
                                className={`text-[12px] font-bold transition-all duration-300 ${
                                  isCompleted
                                    ? "text-gray-900"
                                    : isCurrent
                                    ? "text-blue-600"
                                    : "text-gray-400"
                                }`}
                              >
                                {step.label}
                                {isCurrent ? (
                                  <span className="ml-2 animate-pulse">
                                    ...
                                  </span>
                                ) : null}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center py-6 px-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <Cpu
                          size={28}
                          className={
                            isStreaming
                              ? "text-blue-500 mb-3 animate-pulse"
                              : "text-gray-300 mb-3"
                          }
                        />
                        <p className="text-[13px] font-bold text-gray-700 text-center">
                          {isStreaming
                            ? "✅ 로컬 시뮬레이션 가동 중"
                            : "로컬 모드 대기 중"}
                        </p>
                        <p className="text-[11px] text-gray-400 mt-2 text-center leading-relaxed">
                          실시간 API 토글이 꺼져 있습니다.
                          <br />
                          가상 모드로 작동합니다.
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Live Metrics Component */}
                <div className="flex-1 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[1.5rem] md:rounded-[2rem] p-6 md:p-8 text-white flex flex-col relative overflow-hidden shrink-0 shadow-[0_20px_40px_rgba(37,99,235,0.2)]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
                  <h3 className="text-[12px] md:text-[13px] font-bold text-blue-200 uppercase tracking-widest mb-6 flex items-center gap-2">
                    <Activity size={16} /> Live Metrics
                  </h3>
                  <div className="mt-auto space-y-5 relative z-10">
                    <div>
                      <p className="text-blue-200/80 text-[11px] font-medium mb-1 flex items-center gap-1.5">
                        <Users size={12} /> Current Viewers
                      </p>
                      <p className="text-3xl font-extrabold flex items-baseline gap-2">
                        2,491{" "}
                        <span className="text-[12px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                          <TrendingUp size={10} /> 12%
                        </span>
                      </p>
                    </div>
                    <div className="h-px w-full bg-white/10"></div>
                    <div>
                      <p className="text-blue-200/80 text-[11px] font-medium mb-1 flex items-center gap-1.5">
                        <ShoppingBag size={12} /> Total Sales
                      </p>
                      <p className="text-2xl font-extrabold tracking-tight">
                        ₩ 12,450,000
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Center Video Area & Chat Box (Right Side) */}
              <div className="flex-1 flex flex-col gap-6 md:gap-8 z-10 w-full min-w-0">
                <div className="w-full aspect-video bg-[#050505] rounded-[1.5rem] md:rounded-[2.5rem] relative overflow-hidden shadow-xl shrink-0 border border-gray-800">
                  {/* REAL WEBRTC VIDEO ELEMENT */}
                  <video
                    ref={streamVideoRef}
                    onPlaying={() => setIsVideoPlaying(true)}
                    className={`absolute inset-0 w-full h-full z-20 transition-opacity duration-1000 ${
                      avatarProvider === "did"
                        ? "object-contain bg-[#050505]"
                        : "object-cover"
                    }`}
                    style={{
                      opacity:
                        useHeygen &&
                        heygenStatus === "connected" &&
                        isVideoPlaying
                          ? 1
                          : 0,
                    }}
                    autoPlay
                    playsInline
                    muted={false}
                  />

                  {/* FALLBACK IMAGE */}
                  <img
                    src={
                      avatars.find((a) => a.id === selectedAvatar)?.img ||
                      avatars[0].img
                    }
                    className="absolute inset-0 w-full h-full object-cover z-10 transition-opacity duration-1000"
                    style={{
                      opacity:
                        useHeygen &&
                        heygenStatus === "connected" &&
                        isVideoPlaying
                          ? 0
                          : 1,
                      filter:
                        !isStreaming || heygenStatus === "connecting"
                          ? "grayscale(80%) blur(4px) brightness(0.6)"
                          : "none",
                    }}
                    alt="Host"
                  />

                  <div className="absolute inset-0 bg-gradient-to-t from-[#050505] via-transparent to-[#050505]/40 pointer-events-none z-30"></div>

                  <div className="absolute top-4 left-4 md:top-8 md:left-8 flex items-center gap-2 md:gap-4 z-40">
                    <div className="bg-[#FF3333] text-white px-3 py-1.5 md:px-4 md:py-2 rounded-lg md:rounded-xl text-[10px] md:text-[12px] font-bold tracking-widest flex items-center gap-2 shadow-[0_0_20px_rgba(255,51,51,0.4)]">
                      <div className="w-1.5 h-1.5 md:w-2 md:h-2 bg-white rounded-full animate-pulse"></div>{" "}
                      LIVE
                    </div>
                    <div className="bg-black/40 backdrop-blur-xl text-white px-3 py-1.5 md:px-5 md:py-2 rounded-lg md:rounded-xl text-[11px] md:text-[13px] font-bold flex items-center gap-2">
                      <Users
                        size={14}
                        className="md:w-4 md:h-4 text-gray-300"
                      />{" "}
                      2,491
                    </div>
                  </div>

                  {liveNotification ? (
                    <div className="absolute top-4 md:top-8 left-1/2 -translate-x-1/2 bg-white/90 backdrop-blur-md px-4 py-2 md:px-6 md:py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 animate-bounceIn">
                      <ShoppingBag size={14} className="text-emerald-500" />
                      <span className="text-[11px] md:text-[13px] font-bold text-gray-800">
                        {liveNotification}
                      </span>
                    </div>
                  ) : null}

                  {heygenStatus === "connecting" ? (
                    <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                      <div className="bg-white/5 border border-white/10 p-6 md:p-10 rounded-[1.5rem] md:rounded-[2rem] shadow-2xl backdrop-blur-2xl flex flex-col items-center">
                        <Focus className="w-10 h-10 md:w-14 md:h-14 text-blue-400 animate-spin mb-4 md:mb-6" />
                        <span className="text-[10px] md:text-[12px] font-bold text-white tracking-[0.25em] uppercase animate-pulse">
                          Connecting to Server...
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {pipelineStep === "lipsync_render" && useHeygen ? (
                    <div className="absolute top-4 right-4 md:top-8 md:right-8 bg-black/60 backdrop-blur-md px-4 py-2 rounded-xl border border-white/10 z-50 flex items-center gap-2">
                      <Loader2
                        size={16}
                        className="text-blue-400 animate-spin"
                      />
                      <span className="text-[12px] font-bold text-white hidden md:inline">
                        비디오 렌더링 중...
                      </span>
                    </div>
                  ) : null}

                  <div className="absolute bottom-4 left-4 right-4 md:bottom-8 md:left-8 md:right-8 flex justify-between items-end z-40 pointer-events-none">
                    <div className="bg-black/50 backdrop-blur-2xl border border-white/10 p-4 md:p-6 rounded-[1.5rem] md:rounded-[2rem] max-w-[85%] md:max-w-xl shadow-2xl pointer-events-auto flex items-center justify-between gap-3 md:gap-4">
                      <div className="flex-1 overflow-hidden">
                        <p className="text-[9px] md:text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1.5 md:mb-3 flex items-center gap-1.5 md:gap-2">
                          <ShoppingBag size={10} className="md:w-3 md:h-3" />{" "}
                          Current Item
                        </p>
                        <p className="text-[13px] md:text-[16px] font-medium text-white leading-snug md:leading-relaxed truncate md:whitespace-normal">
                          {getDisplayTitle(productUrl, fetchedProductName)}
                        </p>
                      </div>
                      <button
                        onClick={handlePurchase}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 md:px-5 md:py-3 rounded-xl md:rounded-2xl font-bold text-[12px] md:text-[14px] shadow-[0_0_15px_rgba(37,99,235,0.4)] active:scale-95 transition-all shrink-0 flex items-center gap-1.5"
                      >
                        <ShoppingBag size={14} className="hidden md:block" />{" "}
                        {selectedLanguage === "en" ? "Buy" : "구매하기"}
                      </button>
                    </div>

                    <div className="relative w-16 h-32 md:w-20 md:h-40 pointer-events-none overflow-visible shrink-0 ml-2">
                      {reactions.map((r) => (
                        <div
                          key={r.id}
                          className="absolute bottom-0 text-xl md:text-2xl animate-float-up drop-shadow-md z-50"
                          style={{ left: r.leftOffset }}
                        >
                          {r.emoji}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Chat Area */}
                <div className="bg-white rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)] flex flex-col overflow-hidden h-[400px] md:h-[500px] shrink-0">
                  <div className="px-5 py-4 md:px-8 md:py-6 border-b border-gray-100 flex items-center justify-between bg-white z-10 shadow-sm shrink-0">
                    <div className="flex items-center gap-2 md:gap-3 text-gray-900 font-bold text-[14px] md:text-[16px] tracking-tight">
                      <div className="p-1.5 md:p-2 bg-blue-50 rounded-lg md:rounded-xl">
                        <MessageSquare
                          size={16}
                          className="md:w-[18px] md:h-[18px] text-blue-600"
                        />
                      </div>
                      Audience Chat
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-5 md:p-8 space-y-5 md:space-y-8 custom-scrollbar bg-gray-50/30">
                    {chatHistory.map((chat) => (
                      <div
                        key={chat.id}
                        className={`flex flex-col ${
                          chat.type.includes("ai") ? "items-end" : "items-start"
                        }`}
                      >
                        <span
                          className={`text-[10px] md:text-[11px] font-bold mb-1.5 md:mb-2 uppercase tracking-widest flex items-center gap-1.5 ${
                            chat.type.includes("ai")
                              ? "text-blue-600"
                              : "text-gray-400"
                          }`}
                        >
                          {chat.type.includes("ai") ? (
                            <Sparkles size={10} />
                          ) : null}
                          {chat.user}
                        </span>
                        <div
                          className={`p-4 md:p-5 rounded-[1.2rem] md:rounded-[1.5rem] text-[13px] md:text-[14px] font-medium max-w-[90%] md:max-w-[85%] leading-relaxed shadow-sm ${
                            chat.type === "ai_loading"
                              ? "bg-gray-100 text-gray-600 rounded-tr-sm"
                              : chat.type === "ai"
                              ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-sm"
                              : "bg-white border border-gray-100 text-gray-800 rounded-tl-sm"
                          }`}
                        >
                          {chat.type === "ai_loading" ? (
                            <div className="flex gap-1.5 items-center px-2 py-1 opacity-70">
                              <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                              <div
                                className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                                style={{ animationDelay: "0.15s" }}
                              ></div>
                              <div
                                className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"
                                style={{ animationDelay: "0.3s" }}
                              ></div>
                            </div>
                          ) : (
                            chat.text
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <form
                    onSubmit={handleSendChat}
                    className="p-4 md:p-6 bg-white border-t border-gray-100 flex flex-col sm:flex-row gap-3 md:gap-4 items-center shrink-0"
                  >
                    <input
                      type="text"
                      placeholder={
                        isStreaming
                          ? selectedLanguage === "en"
                            ? "Ask the AI host a question..."
                            : "AI 호스트에게 질문해보세요..."
                          : selectedLanguage === "en"
                          ? "Start broadcast to interact"
                          : "방송을 시작하여 채팅을 활성화하세요"
                      }
                      disabled={
                        !isStreaming ||
                        pipelineStep !== "idle" ||
                        heygenStatus === "connecting"
                      }
                      className="w-full sm:flex-1 bg-gray-50/50 border border-gray-200 rounded-xl md:rounded-2xl px-4 py-3.5 md:px-6 md:py-4 text-[13px] md:text-[14px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:opacity-50"
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                    />
                    <button
                      disabled={
                        !isStreaming ||
                        pipelineStep !== "idle" ||
                        heygenStatus === "connecting"
                      }
                      className="w-full sm:w-auto bg-gray-900 text-white p-3.5 md:px-8 md:py-4 rounded-xl md:rounded-2xl hover:bg-blue-600 transition-all font-bold flex items-center justify-center gap-2 disabled:bg-gray-300"
                    >
                      <Send size={16} className="md:w-[18px] md:h-[18px]" />
                      <span className="sm:inline text-[13px]">Send</span>
                    </button>
                  </form>
                </div>
              </div>
            </div>
          )}

          {/* DASHBOARD TAB */}
          {activeTab === "dashboard" && (
            <div className="p-6 sm:p-12 lg:p-20 space-y-10 md:space-y-16 max-w-[1200px] mx-auto animate-fadeIn">
              <div className="space-y-3 md:space-y-4">
                <h3 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-gray-900">
                  Performance Overview
                </h3>
                <p className="text-gray-500 font-medium text-[14px] md:text-[16px] lg:text-[18px]">
                  Measure the impact of your AI Shopping Host across all
                  campaigns.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                {[
                  {
                    label: "Cost Savings",
                    val: "12,400",
                    prefix: "$",
                    suffix: "",
                    trend: "+12%",
                    sub: "Total production cost saved",
                  },
                  {
                    label: "Avg. Turnaround",
                    val: "2.5",
                    prefix: "",
                    suffix: " MIN",
                    trend: "-82%",
                    sub: "Time from script to video",
                  },
                  {
                    label: "Conversion Lift",
                    val: "4.8",
                    prefix: "+",
                    suffix: "%",
                    trend: "+1.2%",
                    sub: "Increase in live sales",
                  },
                ].map((stat, i) => (
                  <div
                    key={i}
                    className="bg-white p-6 sm:p-8 md:p-10 rounded-[1.5rem] md:rounded-[2.5rem] border border-gray-100 shadow-[0_8px_30px_rgba(0,0,0,0.03)] hover:-translate-y-1 md:hover:-translate-y-2 relative overflow-hidden transition-all"
                  >
                    <div className="absolute top-0 right-0 w-24 h-24 md:w-32 md:h-32 bg-gradient-to-bl from-gray-50 to-transparent rounded-bl-full pointer-events-none"></div>

                    <p className="text-[11px] md:text-[12px] font-bold text-gray-400 uppercase tracking-widest mb-1.5 md:mb-2 relative z-10">
                      {stat.label}
                    </p>
                    <p className="text-[12px] md:text-[13px] font-medium text-gray-400 mb-6 md:mb-8 relative z-10">
                      {stat.sub}
                    </p>
                    <h4 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-gray-900 tracking-tight relative z-10">
                      <AnimatedNumber
                        endValue={stat.val}
                        prefix={stat.prefix}
                        suffix={stat.suffix}
                      />
                    </h4>

                    <div className="mt-6 md:mt-8 flex items-center gap-2 md:gap-3 relative z-10">
                      <span
                        className={`text-[11px] md:text-[12px] font-bold px-2.5 py-1 md:px-3 md:py-1.5 rounded-md md:rounded-lg border ${
                          stat.trend.startsWith("+")
                            ? "bg-emerald-50 text-emerald-600 border-emerald-100"
                            : "bg-blue-50 text-blue-600 border-blue-100"
                        }`}
                      >
                        {stat.trend}
                      </span>
                      <span className="text-[11px] md:text-[12px] text-gray-400 font-medium">
                        vs last month
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* BRAND ASSETS TAB (업로드 기능 활성화) */}
          {activeTab === "assets" && (
            <div className="p-6 sm:p-12 lg:p-20 space-y-10 max-w-[1200px] mx-auto animate-fadeIn">
              <div>
                <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
                  Brand Assets
                </h3>
                <p className="text-gray-500 font-medium mt-2">
                  라이브 방송에 사용할 브랜드 로고, 상품 이미지, 가상 배경을
                  관리하세요.
                </p>
              </div>

              {/* 실제 파일 업로드를 위한 숨겨진 input */}
              <input
                type="file"
                ref={assetInputRef}
                onChange={handleFileUpload}
                style={{ display: "none" }}
                accept="image/png, image/jpeg, image/jpg, video/mp4"
              />

              <div
                onClick={() => assetInputRef.current?.click()}
                className="bg-white p-8 rounded-[2rem] shadow-sm flex flex-col items-center justify-center border-dashed border-2 border-gray-200 min-h-[250px] cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mb-4">
                  <Upload size={28} />
                </div>
                <h4 className="text-[16px] font-bold text-gray-900">
                  새 에셋 업로드
                </h4>
                <p className="text-[13px] text-gray-400 mt-1">
                  PNG, JPG, MP4 (최대 50MB)
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                {brandAssets.map((asset, i) => (
                  <div
                    key={i}
                    className="group relative aspect-square bg-gray-100 rounded-2xl overflow-hidden shadow-sm flex items-center justify-center"
                  >
                    {asset.type === "video" ? (
                      <video
                        src={asset.url}
                        className="w-full h-full object-cover"
                        muted
                        autoPlay
                        loop
                        playsInline
                      />
                    ) : (
                      <img
                        src={asset.url}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        alt="Brand Asset"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <button className="bg-white/20 backdrop-blur-md text-white px-4 py-2 rounded-lg font-bold text-[12px] hover:bg-blue-600 transition-colors">
                        적용하기
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SETTINGS TAB (API Configuration UI 제거) */}
          {activeTab === "settings" && (
            <div className="p-6 sm:p-12 lg:p-20 space-y-10 max-w-[1200px] mx-auto animate-fadeIn">
              <div>
                <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
                  Preferences
                </h3>
                <p className="text-gray-500 font-medium mt-2">
                  시스템 설정 및 계정을 관리합니다.
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-1 space-y-2">
                  {[
                    "Account Profile",
                    // "API Configuration" 제거됨
                    "Billing & Plans",
                    "Notifications",
                  ].map((item, idx) => (
                    <button
                      key={idx}
                      className={`w-full text-left px-5 py-3.5 rounded-xl font-bold text-[14px] transition-all ${
                        idx === 0
                          ? "bg-blue-50 text-blue-600"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      {item}
                    </button>
                  ))}
                </div>

                <div className="lg:col-span-2 space-y-8">
                  <div className="bg-white p-8 rounded-[2rem] border border-gray-100 shadow-sm">
                    <h4 className="text-[18px] font-bold text-gray-900 mb-6 flex items-center gap-2">
                      <Key size={20} className="text-blue-500" /> Avatar Engine
                      Selection
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                      {[
                        {
                          id: "heygen",
                          name: "HeyGen",
                          icon: VideoIcon,
                          color: "text-blue-500",
                          desc: "실시간 립싱크 API",
                        },
                        {
                          id: "did",
                          name: "D-ID",
                          icon: User,
                          color: "text-purple-500",
                          desc: "사진 기반 실시간 스트리밍",
                        },
                        {
                          id: "elevenlabs",
                          name: "ElevenLabs",
                          icon: Mic,
                          color: "text-emerald-500",
                          desc: "고품질 음성 API",
                        },
                        {
                          id: "deepbrain",
                          name: "DeepBrain AI",
                          icon: Server,
                          color: "text-orange-500",
                          desc: "엔터프라이즈 AI 휴먼",
                        },
                      ].map((provider) => (
                        <button
                          key={provider.id}
                          onClick={() => setAvatarProvider(provider.id)}
                          className={`p-5 rounded-2xl border-2 transition-all flex items-center gap-4 text-left ${
                            avatarProvider === provider.id
                              ? "bg-white border-blue-500 shadow-md scale-[1.02]"
                              : "bg-gray-50 border-gray-100 opacity-60 hover:opacity-100"
                          }`}
                        >
                          <span
                            className={`p-3 rounded-xl bg-white shadow-sm block ${provider.color}`}
                          >
                            <provider.icon size={24} />
                          </span>
                          <span className="flex-1 block">
                            <span className="font-bold text-[15px] text-gray-900 block">
                              {provider.name}
                            </span>
                            <span className="text-[12px] text-gray-500 block">
                              {provider.desc}
                            </span>
                          </span>
                          {avatarProvider === provider.id ? (
                            <span className="bg-blue-500 text-white p-1 rounded-full flex">
                              <CheckCircle2 size={16} />
                            </span>
                          ) : null}
                        </button>
                      ))}
                    </div>

                    {/* 백엔드 연동 API 입력(Keys Configuration) 숨김*/}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FAQ TAB */}
          {activeTab === "faq" && (
            <div className="p-6 sm:p-12 lg:p-20 space-y-10 max-w-[1200px] mx-auto animate-fadeIn">
              <div className="text-center max-w-2xl mx-auto space-y-4">
                <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-3">
                  <HelpCircle size={32} />
                </div>
                <h3 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gray-900">
                  How can we help?
                </h3>
                <p className="text-gray-500 font-medium text-[16px]">
                  무엇이든 물어보세요. Studio.ai 지원팀이 대기 중입니다.
                </p>

                <div className="relative mt-8">
                  <Search
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400"
                    size={20}
                  />
                  <input
                    type="text"
                    placeholder="검색어를 입력하세요 (예: 결제, API 한도)"
                    className="w-full bg-white border border-gray-200 rounded-full pl-12 pr-6 py-4 text-[15px] shadow-sm focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-12 max-w-4xl mx-auto">
                {[
                  "대본 생성 글자 수 제한이 있나요?",
                  "라이브 방송 송출(OBS) 연동 방법",
                  "커스텀 아바타를 만들고 싶어요",
                  "결제 수단 변경 및 플랜 업그레이드",
                ].map((q, i) => (
                  <div
                    key={i}
                    className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all cursor-pointer flex justify-between items-center group active:scale-[0.98]"
                  >
                    <span className="font-bold text-gray-800 text-[14px]">
                      {q}
                    </span>
                    <ChevronRight
                      size={18}
                      className="text-gray-300 group-hover:text-blue-500 transition-colors"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>

        {/* 프리미엄 업그레이드 모달 */}
        {showPremiumModal && (
          <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-5xl overflow-hidden relative border border-amber-200 animate-flipIn flex flex-col md:flex-row max-h-[90vh]">
              {/* Left Column - PRO 혜택 안내 */}
              <div className="w-full md:w-[45%] bg-gradient-to-br from-gray-900 to-gray-800 text-white p-8 md:p-10 flex flex-col justify-between overflow-y-auto custom-scrollbar border-b md:border-b-0 md:border-r border-gray-700 relative">
                <div className="absolute top-0 right-0 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div>
                  <Crown
                    size={48}
                    className="text-amber-400 mb-6 drop-shadow-[0_0_15px_rgba(251,191,36,0.5)]"
                  />
                  <h2 className="text-3xl font-extrabold mb-3 tracking-tight">
                    Studio.ai PRO
                  </h2>
                  <p className="text-gray-300 text-[15px] mb-8 leading-relaxed">
                    하나의 구독으로 글로벌 AI 커머스를
                    <br />
                    지금 바로 시작하세요.
                  </p>

                  <ul className="space-y-5 mb-8">
                    <li className="flex items-center gap-3 text-gray-200 font-medium text-[14px]">
                      <div className="bg-emerald-500/20 p-1.5 rounded-full">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      </div>
                      <span>
                        모바일 / 웹 <b>100% 계정 동기화</b> 및 통합 사용
                      </span>
                    </li>
                    <li className="flex items-center gap-3 text-gray-200 font-medium text-[14px]">
                      <div className="bg-emerald-500/20 p-1.5 rounded-full">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      </div>
                      <span>
                        영상 및 이미지 <b>나노바나나 워터마크</b> 완벽 제거
                      </span>
                    </li>
                    <li className="flex items-center gap-3 text-gray-200 font-medium text-[14px]">
                      <div className="bg-emerald-500/20 p-1.5 rounded-full">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      </div>
                      <span>
                        나만의 얼굴과 목소리, <b>커스텀 아바타</b> 무제한 생성
                      </span>
                    </li>
                    <li className="flex items-center gap-3 text-gray-200 font-medium text-[14px]">
                      <div className="bg-emerald-500/20 p-1.5 rounded-full">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                      </div>
                      <span>
                        영어, 일본어, 중국어 <b>다국어 글로벌 언어팩</b> 해제
                      </span>
                    </li>
                  </ul>
                </div>

                <div className="bg-white/5 rounded-2xl p-6 text-center border border-white/10 shadow-inner mt-4 backdrop-blur-sm relative z-10">
                  <p className="text-amber-300 font-bold mb-2 text-[13px] tracking-wider uppercase">
                    프리미엄 월간 구독
                  </p>
                  <div className="flex items-end justify-center gap-1">
                    <p className="text-4xl font-extrabold text-white">
                      ₩ 4,900
                    </p>
                    <p className="text-gray-400 font-medium mb-1">/ 월</p>
                  </div>
                </div>
              </div>

              {/* Right Column - Mock 결제 UI */}
              <div className="w-full md:w-[55%] bg-white p-6 md:p-10 flex flex-col overflow-y-auto custom-scrollbar relative">
                <div
                  className="absolute top-4 right-4 text-gray-400 hover:text-gray-900 cursor-pointer z-10 transition-colors"
                  onClick={() => setShowPremiumModal(false)}
                >
                  <X size={28} />
                </div>

                <h3 className="text-[20px] font-bold text-gray-900 mb-6 pl-1 mt-4 md:mt-0">
                  결제 방법
                </h3>

                {/* 결제 수단 그리드 */}
                <div className="flex flex-col gap-2">
                  {/* Row 1: 퀵계좌이체 (Full width) */}
                  <button
                    onClick={() => setSelectedPaymentMethod("quick")}
                    className={`relative w-full border ${
                      selectedPaymentMethod === "quick"
                        ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/10"
                        : "border-gray-300 hover:border-blue-400"
                    } rounded-lg py-4 transition-all bg-white font-bold text-gray-800 text-[15px]`}
                  >
                    <div className="absolute -top-2.5 left-2 bg-[#3182F6] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full z-10 tracking-tight shadow-sm">
                      3% 즉시 할인
                    </div>
                    퀵계좌이체
                  </button>

                  {/* Row 2, 3: 그리드 형태 */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    <button
                      onClick={() => setSelectedPaymentMethod("card")}
                      className={`border ${
                        selectedPaymentMethod === "card"
                          ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/10"
                          : "border-gray-300 hover:border-blue-400"
                      } rounded-lg py-3.5 transition-all bg-white text-[14px] font-medium text-gray-700 tracking-tight`}
                    >
                      신용·체크카드
                    </button>

                    <button
                      onClick={() => setSelectedPaymentMethod("toss")}
                      className={`border ${
                        selectedPaymentMethod === "toss"
                          ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/10"
                          : "border-gray-300 hover:border-blue-400"
                      } rounded-lg py-3.5 transition-all bg-white flex items-center justify-center gap-1`}
                    >
                      <span className="text-[#3182F6] font-bold text-[16px] tracking-tighter">
                        toss
                      </span>
                      <span className="text-gray-500 font-bold text-[16px] tracking-tighter">
                        pay
                      </span>
                    </button>

                    <button
                      onClick={() => setSelectedPaymentMethod("payco")}
                      className={`relative border ${
                        selectedPaymentMethod === "payco"
                          ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/10"
                          : "border-gray-300 hover:border-blue-400"
                      } rounded-lg py-3.5 transition-all bg-white flex items-center justify-center`}
                    >
                      <div className="absolute -top-2.5 right-2 bg-[#3182F6] text-white text-[11px] font-bold px-2.5 py-0.5 rounded-full z-10 tracking-tight shadow-sm">
                        적립 혜택
                      </div>
                      <span className="text-[#E22E2F] font-black text-[15px] tracking-tighter">
                        PAYCO
                      </span>
                    </button>

                    <button
                      onClick={() => setSelectedPaymentMethod("kakao")}
                      className={`border ${
                        selectedPaymentMethod === "kakao"
                          ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/10"
                          : "border-gray-300 hover:border-blue-400"
                      } rounded-lg py-3.5 transition-all bg-white flex items-center justify-center gap-1`}
                    >
                      <div className="bg-[#FFEB00] text-black px-2 py-0.5 rounded text-[13px] font-black tracking-tight">
                        pay
                      </div>
                    </button>

                    <button
                      onClick={() => setSelectedPaymentMethod("naver")}
                      className={`border ${
                        selectedPaymentMethod === "naver"
                          ? "border-blue-500 ring-1 ring-blue-500 bg-blue-50/10"
                          : "border-gray-300 hover:border-blue-400"
                      } rounded-lg py-3.5 transition-all bg-white flex items-center justify-center gap-1.5`}
                    >
                      <span className="text-[#03C75A] font-black text-[16px]">
                        N
                      </span>
                      <span className="text-[#03C75A] font-bold text-[15px] tracking-tight">
                        pay
                      </span>
                    </button>
                  </div>
                </div>

                {/* 안내 배너 */}
                <div className="bg-[#F2F4F6] rounded-xl p-3.5 flex items-center gap-2 mt-6 mb-6 text-[14px] font-medium text-gray-700">
                  <div className="w-5 h-5 bg-[#0b3b8c] rounded-full flex items-center justify-center text-white font-bold text-[12px] italic">
                    S
                  </div>
                  신한카드 최대 3개월 무이자 할부
                </div>

                <div className="text-[13px] text-gray-500 space-y-2 mb-8 pl-1">
                  <p>
                    <span className="font-bold text-gray-600">Payco</span> ·
                    포인트 결제 시 1% 적립
                  </p>
                  <p>
                    <span className="font-bold text-gray-600">퀵계좌이체</span>{" "}
                    · 1000원 이상 결제 시 3% 즉시 할인
                  </p>
                  <button className="text-gray-500 hover:text-gray-700 font-medium transition-colors">
                    신용카드 무이자 할부 안내 &gt;
                  </button>
                </div>

                {/* 약관 동의 체크박스 */}
                <div className="mt-auto">
                  <label className="flex items-center gap-3 cursor-pointer mb-6 group">
                    <div
                      className={`w-5 h-5 rounded flex items-center justify-center border transition-colors ${
                        isTermsChecked
                          ? "bg-[#3182F6] border-[#3182F6]"
                          : "bg-white border-gray-300 group-hover:border-blue-400"
                      }`}
                    >
                      {isTermsChecked && (
                        <Check
                          size={14}
                          className="text-white"
                          strokeWidth={3}
                        />
                      )}
                    </div>
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={isTermsChecked}
                      onChange={(e) => setIsTermsChecked(e.target.checked)}
                    />
                    <span className="text-[14px] text-gray-700 font-medium tracking-tight">
                      <span className="font-bold text-blue-600">[필수]</span>{" "}
                      결제 서비스 이용 약관, 개인정보 처리 동의{" "}
                      <span className="text-gray-400">&gt;</span>
                    </span>
                  </label>

                  <button
                    onClick={handleMockPayment}
                    disabled={isPaymentProcessing}
                    className="w-full bg-[#3182F6] hover:bg-[#1B64DA] text-white font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2 text-[16px] shadow-[0_8px_20px_rgba(49,130,246,0.3)] active:scale-[0.98] disabled:opacity-50 disabled:active:scale-100"
                  >
                    {isPaymentProcessing ? (
                      <Loader2 className="animate-spin" size={20} />
                    ) : (
                      "결제하기"
                    )}
                  </button>

                  <div className="mt-4 flex justify-center items-center gap-1.5 text-[11px] text-gray-400 font-medium">
                    <ShieldCheck size={14} /> 안전한 모의 결제 환경입니다.
                    (테스트)
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        @media (min-width: 768px) { .custom-scrollbar::-webkit-scrollbar { width: 8px; } }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; border: 2px solid white; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        body { font-family: 'Plus Jakarta Sans', sans-serif; }

        #root { animation: fadeIn 0.5s ease-out; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }

        /* Floating Animation for Hearts */
        .animate-float-up { animation: floatUp 2s ease-out forwards; }
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          50% { transform: translateY(-80px) scale(1.2); }
          100% { opacity: 0; transform: translateY(-150px) scale(1.5); }
        }

        /* Bounce Animation for Notifications */
        .animate-bounceIn { animation: bounceIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
        @keyframes bounceIn {
          0% { opacity: 0; transform: translate(-50%, -20px); }
          100% { opacity: 1; transform: translate(-50%, 0); }
        }

        .animate-spin-slow { animation: spin 3s linear infinite; }
        
        .animate-gradient-x {
          background-size: 200% auto;
          animation: gradientX 3s linear infinite;
        }
        @keyframes gradientX {
          0% { background-position: 0% center; }
          50% { background-position: 100% center; }
          100% { background-position: 0% center; }
        }
        
        @keyframes flipIn {
          0% { 
            opacity: 0; 
            transform: perspective(1200px) rotateY(-25deg) translateX(40px) scale(0.95); 
          }
          100% { 
            opacity: 1; 
            transform: perspective(1200px) rotateY(0deg) translateX(0) scale(1); 
          }
        }
        .animate-flipIn { 
          animation: flipIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.05) forwards; 
        }
      `,
        }}
      />
    </div>
  );
};

export default App;
