"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, UploadCloud, AlertCircle, Trash2, Pencil, Loader2, RefreshCw } from "lucide-react";
import { createProject, uploadFloorPlan } from "@/lib/api/projects";
import { useProjectStore } from "@/lib/store";

interface RoomBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

interface Room {
  id: string;
  name: string;
  confidence: string;
  length: string;
  width: string;
  height: string;
  color: string;
  confidenceColor: string;
  box?: RoomBox; // position on the floor plan image, as % (top/left/width/height)
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreateProjectModal({ isOpen, onClose }: CreateProjectModalProps) {
  const router = useRouter();
  const { setProject } = useProjectStore();
  const [step, setStep] = useState(1);
  const [projectName, setProjectName] = useState("");
  const [projectType, setProjectType] = useState("");
  const [address, setAddress] = useState("");
  const [hasError, setHasError] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [apiLoading, setApiLoading] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const roomIdCounter = useRef(100);

  // Step 4 state
  const [ceilingHeight, setCeilingHeight] = useState("2.4");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const isStep1Valid = projectName.trim() !== "" && projectType !== "";

  // Step 2 state
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Rooms — empty by default, filled from Gemini API response ──
  const [rooms, setRooms] = useState<Room[]>([]);
  const [floorPlanUrl, setFloorPlanUrl] = useState<string | null>(null);
  const floorPlanImgRef = useRef<HTMLImageElement>(null);
  const [imgRenderBox, setImgRenderBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // Recalculate the actual rendered image bounds (accounts for object-contain letterboxing)
  const recalcImgBounds = () => {
    const img = floorPlanImgRef.current;
    if (!img || !img.naturalWidth || !img.naturalHeight) return;
    const containerW = img.clientWidth;
    const containerH = img.clientHeight;
    const naturalRatio = img.naturalWidth / img.naturalHeight;
    const containerRatio = containerW / containerH;

    let renderW: number, renderH: number, offsetX: number, offsetY: number;
    if (naturalRatio > containerRatio) {
      // image is wider — letterboxed top/bottom
      renderW = containerW;
      renderH = containerW / naturalRatio;
      offsetX = 0;
      offsetY = (containerH - renderH) / 2;
    } else {
      // image is taller — letterboxed left/right
      renderH = containerH;
      renderW = containerH * naturalRatio;
      offsetY = 0;
      offsetX = (containerW - renderW) / 2;
    }

    setImgRenderBox({
      top:    (offsetY / containerH) * 100,
      left:   (offsetX / containerW) * 100,
      width:  (renderW / containerW) * 100,
      height: (renderH / containerH) * 100,
    });
  };

  useEffect(() => {
    if (step !== 3 || !floorPlanUrl) return;
    recalcImgBounds();
    window.addEventListener('resize', recalcImgBounds);
    return () => window.removeEventListener('resize', recalcImgBounds);
  }, [step, floorPlanUrl]);

  useEffect(() => {
    if (!isOpen) {
      const timer = setTimeout(() => {
        setStep(1);
        setProjectName("");
        setProjectType("");
        setAddress("");
        setHasError(false);
        setCeilingHeight("2.4");
        setFile(null);
        setIsDragging(false);
        setProjectId(null);
        setApiError(null);
        setApiLoading(false);
        setRooms([]);
        setSelectedRoomId(null);
        setFloorPlanUrl(null);
        setImgRenderBox(null);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const projectTypes = ["Residential", "Commercial", "Hospitality", "Healthcare", "Education", "Industrial"];

  const handleAddRoom = () => {
    const newId = `manual-${roomIdCounter.current}`;
    roomIdCounter.current += 1;
    const colors = ["#e5e7eb", "#fde68a", "#bae6fd", "#fed7aa", "#c7d2fe", "#fbcfe8", "#a7f3d0"];
    const randomColor = colors[rooms.length % colors.length];
    setRooms([...rooms, {
      id:              newId,
      name:            `New Room ${rooms.length + 1}`,
      confidence:      "100%",
      length:          "3.0",
      width:           "3.0",
      height:          "2.4",
      color:           randomColor,
      confidenceColor: "#b3b9b9",
    }]);
  };

  const handleRenameRoom = (id: string, newName: string) => {
    setRooms(rooms.map(room => room.id === id ? { ...room, name: newName } : room));
  };

  const handleDeleteRoom = (id: string) => {
    setRooms(rooms.filter(room => room.id !== id));
    if (selectedRoomId === id) setSelectedRoomId(null);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.[0]) {
      setFile(e.dataTransfer.files[0]);
      setApiError(null);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files?.[0]) {
      setFile(e.target.files[0]);
      setApiError(null);
    }
  };

  const applyCeilingHeight = () => {
    setRooms(rooms.map(room => ({ ...room, height: ceilingHeight })));
  };

  const handleContinue = async () => {
    setApiError(null);

    // Step 1 — Create project
    if (step === 1) {
      if (!projectName.trim()) {
        setHasError(true);
        return;
      }
      try {
        setApiLoading(true);
        const project = await createProject(projectName, projectType, address);
        setProjectId(project.id);
        setProject({ id: project.id, name: project.name, floorPlanUrl: null });
        setStep(2);
      } catch (err: any) {
        setApiError(err.message || "Failed to create project");
      } finally {
        setApiLoading(false);
      }
      return;
    }

    // Step 2 — Upload floor plan + Gemini detection
    if (step === 2) {
      if (!file) {
        setApiError("Please upload a floor plan to continue");
        return;
      }
      try {
        setApiLoading(true);
        const result = await uploadFloorPlan(projectId!, file);

        setProject({
          id:           projectId!,
          name:         projectName,
          floorPlanUrl: result.floor_plan_url,
        });
        setFloorPlanUrl(result.floor_plan_url);

        // ── Use Gemini-detected rooms ──
        if (result.detected_rooms && result.detected_rooms.length > 0) {
          setRooms(
            result.detected_rooms.map((room: any) => ({
              id:              room.id,
              name:            room.name,
              confidence:      `${room.confidence}%`,
              // Use dimensions extracted from the floor plan text if available, else blank for manual entry
              length:          room.length ? String(room.length) : "",
              width:           room.width ? String(room.width) : "",
              height:          "2.4",
              color:           room.color || "#e5e7eb",
              confidenceColor: room.confidence >= 85 ? "#b3b9b9" : "#9c7b31",
              box:             room.box || undefined,
            }))
          );
        } else {
          // AI detection returned nothing — give user a blank slate to add manually
          setRooms([]);
        }

        setStep(3);
      } catch (err: any) {
        setApiError(err.message || "Failed to upload floor plan");
      } finally {
        setApiLoading(false);
      }
      return;
    }

    // Step 3 → 4 → 5
    if (step < 5) {
      setStep(step + 1);
    } else {
      // Step 5 — Create project → loader → navigate
      setIsCreating(true);
      setTimeout(() => {
        router.push("/canvas");
      }, 2000);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setApiError(null);
      setStep(step - 1);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <AnimatePresence>
        <div key="modal-backdrop" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-[2px] p-4">
          <motion.div
            key="modal-card"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="bg-white rounded-[24px] w-full shadow-2xl flex flex-col overflow-hidden max-h-[90vh] max-w-[860px]"
          >
            {/* Header */}
            <div className="flex justify-between items-start px-8 pt-8 pb-4">
              <div>
                <h2 className="text-[20px] font-semibold text-[#0a0a0a] tracking-tight">
                  {step === 1 && "Project details"}
                  {step === 2 && "Upload floor plan"}
                  {step === 3 && "Review detected rooms"}
                  {step === 4 && "Room dimensions"}
                  {step === 5 && "Confirm project"}
                </h2>
                <p className="text-[14px] text-[#525252] mt-1">
                  {step === 1 && "Name your project and tell us what kind of space it is."}
                  {step === 2 && "Our AI will detect rooms automatically. You can review and rename them next."}
                  {step === 3 && `${rooms.length} room${rooms.length !== 1 ? "s" : ""} found. Click a room to rename or remove it.`}
                  {step === 4 && "Enter measurements in metres."}
                  {step === 5 && "Review everything before we save your project."}
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div
              style={{
                height: step === 5 ? 'auto' : '60vh',
                minHeight: step === 5 ? 'auto' : '500px',
                transition: 'height 0.4s cubic-bezier(0.4,0,0.2,1)',
              }}
              className="px-8 py-4 overflow-y-auto custom-scrollbar"
            >

              {/* ── Step 1 ── */}
              {step === 1 && (
                <div className="flex flex-col gap-6">
                  <div>
                    <label className="text-[14px] font-medium text-[#0a0a0a] mb-2 flex items-center gap-1">
                      Project name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => { setProjectName(e.target.value); if (e.target.value) setHasError(false); }}
                      placeholder="e.g. Riverside Apartment 4B"
                      className={`w-full h-[44px] px-4 rounded-xl border ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#004643]/20 text-[14px] placeholder:text-gray-400`}
                    />
                    {hasError && <p className="text-red-500 text-[12px] mt-1">Project name is required</p>}
                  </div>

                  <div>
                    <label className="text-[14px] font-medium text-[#0a0a0a] mb-2 flex items-center gap-1">
                      Project type <span className="text-red-500">*</span>
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {projectTypes.map(type => (
                        <button
                          key={type}
                          onClick={() => setProjectType(type)}
                          className={`px-[16px] py-[6px] rounded-full text-[13px] font-medium transition-all ${projectType === type ? 'bg-[#004643] text-white border border-[#c4db7c]' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-[14px] font-medium text-[#0a0a0a] mb-2 flex items-center gap-1">
                      Address <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Street, city, postcode"
                      className="w-full h-[44px] px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004643]/20 text-[14px] placeholder:text-gray-400"
                    />
                  </div>
                </div>
              )}

              {/* ── Step 2 ── */}
              {step === 2 && (
                <div className="flex flex-col gap-4 h-full">
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept=".jpg,.jpeg,.png,.webp,.pdf"
                    onChange={handleFileChange}
                  />
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-[24px] flex-1 flex flex-col items-center justify-center p-6 transition-colors cursor-pointer group ${isDragging ? 'border-[#004643] bg-[#f4f7eb]' : 'border-gray-200 bg-[#fafafa] hover:border-[#004643]/30 hover:bg-[#f4f7eb]/30'}`}
                  >
                    <div className="w-12 h-12 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center mb-4 group-hover:-translate-y-1 transition-transform">
                      <UploadCloud className="w-5 h-5 text-[#0a0a0a]" />
                    </div>
                    {file ? (
                      <>
                        <h3 className="text-[15px] font-medium text-[#004643] mb-1">{file.name}</h3>
                        <p className="text-[12px] text-gray-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-[15px] font-medium text-[#0a0a0a] mb-1">Drag and drop your floor plan</h3>
                        <p className="text-[14px] text-gray-500 mb-2">or browse files</p>
                      </>
                    )}
                    <p className="text-[12px] text-gray-400">JPG, PNG, WebP or PDF • max 20 MB</p>
                  </div>
                </div>
              )}

              {/* ── Step 3 — Rooms from Gemini ── */}
              {step === 3 && (
                <div className="flex gap-[24px] h-full">
                  {/* Real floor plan image with colored room overlays */}
                  <div className="bg-[#f7f8f8] border border-[#eaedec] h-full min-h-[350px] relative rounded-[12px] flex-1 overflow-hidden flex items-center justify-center">
                    {floorPlanUrl ? (
                      floorPlanUrl.toLowerCase().endsWith('.pdf') ? (
                        <div className="flex flex-col items-center justify-center gap-3 text-center px-6">
                          <div className="w-12 h-12 bg-white shadow-sm border border-gray-100 rounded-full flex items-center justify-center">
                            <UploadCloud className="w-5 h-5 text-[#004643]" />
                          </div>
                          <p className="text-[13px] text-gray-500">
                            PDF floor plan uploaded. Preview isn't shown here, but rooms were detected from it below.
                          </p>
                          <a
                            href={floorPlanUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[13px] font-medium text-[#004643] hover:underline"
                          >
                            View original PDF
                          </a>
                        </div>
                      ) : (
                        <div className="relative w-full h-full">
                          <img
                            ref={floorPlanImgRef}
                            src={floorPlanUrl}
                            alt="Uploaded floor plan"
                            className="w-full h-full object-contain p-3"
                            onLoad={recalcImgBounds}
                          />
                          {/* Colored room overlays — positioned using Gemini bounding boxes,
                              aligned to the actual rendered image bounds (accounts for object-contain letterboxing) */}
                          {imgRenderBox && (
                            <div
                              className="absolute pointer-events-none"
                              style={{
                                top:    `calc(${imgRenderBox.top}% + 12px)`,
                                left:   `calc(${imgRenderBox.left}% + 12px)`,
                                width:  `calc(${imgRenderBox.width}% - 24px)`,
                                height: `calc(${imgRenderBox.height}% - 24px)`,
                              }}
                            >
                              {rooms.filter(r => r.box).map((room) => (
                                <div
                                  key={room.id}
                                  onClick={() => setSelectedRoomId(room.id)}
                                  className={`absolute flex items-center justify-center rounded-[3px] transition-all cursor-pointer pointer-events-auto border-2 ${
                                    selectedRoomId === room.id
                                      ? 'border-[#004643] shadow-md z-20'
                                      : 'border-transparent hover:border-[#004643]/50 z-10'
                                  }`}
                                  style={{
                                    top:             `${room.box!.top}%`,
                                    left:            `${room.box!.left}%`,
                                    width:           `${room.box!.width}%`,
                                    height:          `${room.box!.height}%`,
                                    backgroundColor: room.color + (selectedRoomId === room.id ? '80' : '55'),
                                  }}
                                  title={room.name}
                                >
                                  <span className="text-[11px] font-semibold text-[#004643] text-center leading-tight line-clamp-2 bg-white/70 rounded px-1">
                                    {room.name}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                          {rooms.length === 0 && (
                            <div className="absolute inset-0 flex items-end justify-center pb-6 bg-gradient-to-t from-white/90 via-white/10 to-transparent">
                              <p className="text-gray-500 text-[13px] text-center px-4 bg-white/90 rounded-lg py-2 shadow-sm">
                                No rooms detected. Add rooms manually using + Add.
                              </p>
                            </div>
                          )}
                          {rooms.length > 0 && rooms.every(r => !r.box) && (
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 text-gray-500 text-[11px] text-center px-3 py-1 bg-white/90 rounded-full shadow-sm">
                              Room positions unavailable — see list to the right
                            </div>
                          )}
                        </div>
                      )
                    ) : (
                      <div className="flex flex-col items-center justify-center gap-2 text-center px-6">
                        <p className="text-gray-400 text-[13px]">Floor plan preview unavailable.</p>
                      </div>
                    )}
                  </div>

                  {/* Room list — primary review/edit interaction */}
                  <div className="bg-white border border-[#f1f4f4] h-full min-h-[350px] overflow-hidden relative rounded-[12px] w-[280px] shrink-0 flex flex-col">
                    <div className="bg-white border-b border-[#f1f4f4] flex items-center justify-between h-[44px] shrink-0 px-[16px]">
                      <p className="font-semibold text-[#101212] text-[13px]">{rooms.length} room{rooms.length !== 1 ? 's' : ''} detected</p>
                      <button onClick={handleAddRoom} className="font-semibold text-[#004643] text-[13px] hover:underline">+ Add</button>
                    </div>
                    <div className="overflow-y-auto flex-1 hide-scrollbar">
                      {rooms.length === 0 && (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-gray-400 text-[12px] text-center px-4">No rooms yet. Click + Add to add rooms manually.</p>
                        </div>
                      )}
                      {rooms.map((room, index) => (
                        <div
                          key={room.id}
                          onClick={() => setSelectedRoomId(room.id)}
                          className={`min-h-[50px] relative flex items-center px-[16px] py-2 transition-colors cursor-pointer group/item ${index !== 0 ? 'border-t border-[#f1f4f4]' : ''} ${selectedRoomId === room.id ? 'bg-[#f4f7eb]' : 'bg-white hover:bg-gray-50'}`}
                        >
                          <div className="border border-[rgba(0,0,0,0.08)] rounded-[4px] w-[14px] h-[14px] shrink-0" style={{ backgroundColor: room.color }} />
                          <div className="ml-[12px] flex flex-col justify-center flex-1 pr-2 min-w-0">
                            <input
                              value={room.name}
                              onChange={(e) => handleRenameRoom(room.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium text-[#101212] text-[13px] leading-tight bg-transparent border-none outline-none focus:ring-1 focus:ring-[#004643] rounded px-1 -ml-1 w-full truncate"
                            />
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <p className={`font-medium text-[11px] leading-tight ${selectedRoomId === room.id ? 'hidden' : 'group-hover/item:hidden'}`} style={{ color: room.confidenceColor }}>
                              {room.confidence}
                            </p>
                            <div className={`items-center gap-1 ${selectedRoomId === room.id ? 'flex' : 'hidden group-hover/item:flex'}`}>
                              <button
                                onClick={(e) => { e.stopPropagation(); setStep(4); }}
                                className="flex items-center justify-center text-gray-400 hover:text-[#004643] w-[24px] h-[24px] rounded hover:bg-[#c3f4f0]/50 transition-colors"
                                title="Edit dimensions"
                              >
                                <Pencil className="w-[14px] h-[14px]" />
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteRoom(room.id); }}
                                className="flex items-center justify-center text-gray-400 hover:text-red-500 w-[24px] h-[24px] rounded hover:bg-red-50 transition-colors"
                                title="Delete room"
                              >
                                <Trash2 className="w-[14px] h-[14px]" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 4 — Dimensions ── */}
              {step === 4 && (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between bg-[#fafafa] px-4 py-2 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-[18px] h-[18px] text-[#004643]" />
                      <span className="text-[13px] font-medium text-[#0a0a0a]">Apply ceiling height to all rooms</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-white border border-gray-200 rounded-[8px] px-2 h-8 w-[70px]">
                        <input
                          type="text"
                          value={ceilingHeight}
                          onChange={(e) => setCeilingHeight(e.target.value)}
                          className="w-full text-[13px] text-center font-medium focus:outline-none"
                        />
                        <span className="text-[13px] text-gray-500 ml-1">m</span>
                      </div>
                      <button
                        onClick={applyCeilingHeight}
                        className="bg-gray-100 hover:bg-gray-200 text-[#0a0a0a] text-[13px] font-medium px-4 h-8 rounded-[8px] transition-colors"
                      >
                        Apply
                      </button>
                    </div>
                  </div>

                  <div className="border border-gray-200 rounded-[16px] overflow-hidden">
                    <div className="grid grid-cols-4 gap-4 px-5 py-3 bg-[#fafafa] border-b border-gray-200">
                      <div className="text-[11px] font-bold text-gray-500 tracking-[0.05em] col-span-1 uppercase">Room</div>
                      <div className="text-[11px] font-bold text-gray-500 tracking-[0.05em] text-center uppercase">Length (m)</div>
                      <div className="text-[11px] font-bold text-gray-500 tracking-[0.05em] text-center uppercase">Width (m)</div>
                      <div className="text-[11px] font-bold text-gray-500 tracking-[0.05em] text-center uppercase">Height (m)</div>
                    </div>
                    <div className="overflow-y-auto divide-y divide-gray-100 custom-scrollbar">
                      {rooms.map(room => {
                        const autoFilled = room.length !== "" && room.width !== "";
                        return (
                        <div key={room.id} className="grid grid-cols-4 gap-4 px-5 py-2.5 items-center hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-1.5 min-w-0 pr-2">
                            <div className="text-[13px] font-medium text-[#0a0a0a] truncate">{room.name}</div>
                            {autoFilled && (
                              <span className="text-[9px] font-semibold text-[#004643] bg-[#eaf8f4] border border-[#c3f4f0] rounded-full px-1.5 py-0.5 shrink-0" title="Extracted from floor plan">
                                AI
                              </span>
                            )}
                          </div>
                          <div className="flex justify-center">
                            <input
                              type="text"
                              value={room.length}
                              placeholder="—"
                              onChange={(e) => setRooms(rooms.map(r => r.id === room.id ? { ...r, length: e.target.value } : r))}
                              className="w-[54px] h-[28px] border border-gray-200 rounded-md text-center text-[13px] font-medium focus:border-[#004643] focus:outline-none focus:ring-1 focus:ring-[#004643] transition-colors"
                            />
                          </div>
                          <div className="flex justify-center">
                            <input
                              type="text"
                              value={room.width}
                              placeholder="—"
                              onChange={(e) => setRooms(rooms.map(r => r.id === room.id ? { ...r, width: e.target.value } : r))}
                              className="w-[54px] h-[28px] border border-gray-200 rounded-md text-center text-[13px] font-medium focus:border-[#004643] focus:outline-none focus:ring-1 focus:ring-[#004643] transition-colors"
                            />
                          </div>
                          <div className="flex justify-center">
                            <input
                              type="text"
                              value={room.height}
                              onChange={(e) => setRooms(rooms.map(r => r.id === room.id ? { ...r, height: e.target.value } : r))}
                              className="w-[54px] h-[28px] border border-gray-200 rounded-md text-center text-[13px] font-medium focus:border-[#004643] focus:outline-none focus:ring-1 focus:ring-[#004643] transition-colors"
                            />
                          </div>
                        </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 5 — Confirm ── */}
              {step === 5 && (
                <div className="flex flex-col gap-[24px] pb-4">
                  <div className="bg-white border border-[#f1f4f4] rounded-[8px] overflow-hidden shadow-[0px_2px_4px_rgba(0,0,0,0.02)]">
                    <div className="flex items-center justify-between px-[20px] py-[16px] border-b border-[#f1f4f4]">
                      <h3 className="text-[16px] font-bold text-[#101212]">{projectName || "Untitled Project"}</h3>
                      <div className="border border-[#c3f4f0] bg-[#eaf8f4] text-[#004643] text-[12px] font-medium px-3 py-1 rounded-full">
                        {projectType || "Residential"}
                      </div>
                    </div>
                    <div className="px-[20px] py-[16px] flex gap-[60px]">
                      <div>
                        <p className="text-[11px] font-bold text-[#8e9493] mb-1 tracking-[0.05em]">ROOMS</p>
                        <p className="text-[20px] font-bold text-[#101212]">{rooms.length}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-[#8e9493] mb-1 tracking-[0.05em]">FLOOR AREA</p>
                        <p className="text-[20px] font-bold text-[#101212]">
                          {rooms.reduce((acc, room) => acc + (parseFloat(room.length || "0") * parseFloat(room.width || "0")), 0).toFixed(1)} m²
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-white border border-[#f1f4f4] rounded-[8px] overflow-hidden shadow-[0px_2px_4px_rgba(0,0,0,0.02)] flex flex-col">
                    <div className="px-[20px] py-[16px] border-b border-[#f1f4f4]">
                      <h3 className="text-[14px] font-bold text-[#101212]">Room breakdown</h3>
                    </div>
                    <div className="flex px-[20px] py-[12px] border-b border-[#f1f4f4] bg-[#fafafa]">
                      <p className="w-[40%] text-[11px] font-bold text-[#8e9493] tracking-[0.05em]">ROOM</p>
                      <p className="w-[40%] text-[11px] font-bold text-[#8e9493] tracking-[0.05em]">L × W × H</p>
                      <p className="w-[20%] text-[11px] font-bold text-[#8e9493] tracking-[0.05em] text-right">AREA</p>
                    </div>
                    <div className="overflow-y-auto custom-scrollbar">
                      {rooms.map((room, index) => (
                        <div key={room.id} className={`flex px-[20px] py-[16px] items-center ${index !== rooms.length - 1 ? 'border-b border-[#f1f4f4]' : ''}`}>
                          <p className="w-[40%] text-[13px] font-semibold text-[#101212]">{room.name}</p>
                          <p className="w-[40%] text-[13px] font-medium text-[#8e9493]">{room.length} × {room.width} × {room.height} m</p>
                          <p className="w-[20%] text-[13px] font-semibold text-[#004643] text-right">
                            {(parseFloat(room.length || "0") * parseFloat(room.width || "0")).toFixed(1)} m²
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Error toast — above footer */}
            <AnimatePresence>
              {apiError && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.2 }}
                  className="mx-8 mt-2 flex items-center justify-between gap-2 text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100"
                >
                  <div className="flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span className="text-[13px] font-medium">{apiError}</span>
                  </div>
                  <button
                    onClick={() => setApiError(null)}
                    className="p-1 hover:bg-red-100 rounded-full transition-colors shrink-0"
                  >
                    <X size={13} className="text-red-400" />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Footer */}
            <div className="border-t border-[#f1f4f4] px-8 py-5 flex items-center justify-between bg-white rounded-b-[24px]">
              {step > 1 ? (
                <button
                  onClick={handleBack}
                  disabled={apiLoading}
                  className="h-[44px] px-8 bg-[#6B7280] text-white rounded-[8px] text-[14px] font-medium hover:bg-[#555b66] transition-colors disabled:opacity-50"
                >
                  Back
                </button>
              ) : (
                <div />
              )}
              <button
                onClick={handleContinue}
                disabled={(step === 1 && !isStep1Valid) || apiLoading}
                className={`h-[44px] px-8 rounded-[8px] text-[14px] font-medium transition-all flex items-center gap-2 ml-auto ${
                  (step === 1 && !isStep1Valid) || apiLoading
                    ? "bg-[#004643]/50 text-white cursor-not-allowed"
                    : "bg-[#004643] text-white hover:bg-[#003633] shadow-[0_2px_8px_rgba(0,70,67,0.15)]"
                }`}
              >
                {apiLoading && <RefreshCw size={16} className="animate-spin" />}
                {apiLoading && step === 2 ? "Analyzing floor plan..." : step === 5 ? "Create Project" : "Continue"}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Creating overlay */}
      <AnimatePresence>
        {isCreating && (
          <motion.div
            key="creating-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, type: "spring", damping: 18 }}
              className="flex flex-col items-center gap-5"
            >
              <div className="w-16 h-16 rounded-full bg-[#004643]/10 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-[#004643] animate-spin" />
              </div>
              <div className="text-center">
                <p className="text-[18px] font-semibold text-[#101212]">Creating your project…</p>
                <p className="text-[14px] text-[#8e9493] mt-1">Setting up your canvas, hang tight!</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}