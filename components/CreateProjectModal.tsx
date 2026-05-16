"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, UploadCloud, AlertCircle, Plus, Trash2, Pencil, Loader2, RefreshCw } from "lucide-react";
import { createProject, uploadFloorPlan } from "@/lib/api/projects";
import { useProjectStore } from "@/lib/store";

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
  const roomIdCounter = useRef(7);

  // Step 4 state
  const [ceilingHeight, setCeilingHeight] = useState("2.4");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  const isStep1Valid = projectName.trim() !== "" && projectType !== "";

  // Step 2 state
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const projectTypes = ["Residential", "Commercial", "Hospitality", "Healthcare", "Education", "Industrial"];

  const [rooms, setRooms] = useState([
    { id: "1", name: "Living room", confidence: "97%", length: "7.0", width: "5.0", height: "2.4", color: "#c3f4f0", confidenceColor: "#b3b9b9" },
    { id: "2", name: "Kitchen", confidence: "93%", length: "4.0", width: "3.0", height: "2.4", color: "#b9eac5", confidenceColor: "#b3b9b9" },
    { id: "3", name: "Bedroom 1", confidence: "88%", length: "4.5", width: "3.5", height: "2.4", color: "#87ddd7", confidenceColor: "#b3b9b9" },
    { id: "4", name: "Bathroom", confidence: "91%", length: "3.0", width: "2.0", height: "2.4", color: "#f7dfad", confidenceColor: "#b3b9b9" },
    { id: "5", name: "Hallway", confidence: "79%", length: "5.0", width: "1.5", height: "2.4", color: "#d5dbda", confidenceColor: "#9c7b31" },
    { id: "6", name: "Storage", confidence: "72%", length: "2.0", width: "1.5", height: "2.4", color: "#ffc9c0", confidenceColor: "#9c7b31" },
  ]);

  const handleAddRoom = () => {
    const newId = roomIdCounter.current.toString();
    roomIdCounter.current += 1;
    const colors = ["#e5e7eb", "#fde68a", "#bae6fd", "#fed7aa", "#c7d2fe", "#fbcfe8", "#a7f3d0"];
    const randomColor = colors[rooms.length % colors.length];
    const newRoomNumber = rooms.length + 1;
    setRooms([...rooms, {
      id: newId,
      name: `New Room ${newRoomNumber}`,
      confidence: "100%",
      length: "3.0",
      width: "3.0",
      height: "2.4",
      color: randomColor,
      confidenceColor: "#b3b9b9"
    }]);
  };

  const handleRenameRoom = (id: string, newName: string) => {
    setRooms(rooms.map(room => room.id === id ? { ...room, name: newName } : room));
  };

  const handleDeleteRoom = (id: string) => {
    setRooms(rooms.filter(room => room.id !== id));
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setApiError(null); // clear error when file is selected
    }
  };

  const handleContinue = async () => {
    setApiError(null);

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

    if (step === 2) {
      if (!file) {
        setApiError("Please upload a floor plan to continue");
        return;
      }
      try {
        setApiLoading(true);
        const result = await uploadFloorPlan(projectId!, file);
        setProject({
          id: projectId!,
          name: projectName,
          floorPlanUrl: result.floor_plan_url
        });
        setStep(3);
      } catch (err: any) {
        setApiError(err.message || "Failed to upload floor plan");
      } finally {
        setApiLoading(false);
      }
      return;
    }

    if (step < 5) {
      setStep(step + 1);
    } else {
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
            className="bg-white rounded-[24px] w-full shadow-2xl flex flex-col overflow-hidden max-h-[90vh] transition-all duration-300 max-w-[860px]"
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
                  {step === 3 && "6 rooms found. Click a room to rename or remove it."}
                  {step === 4 && "Enter measurements in metres."}
                  {step === 5 && "Review everything before we save your project."}
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>



            {/* Body Content */}
            <div
              style={{
                height: step === 5 ? 'auto' : '60vh',
                minHeight: step === 5 ? 'auto' : '500px',
                transition: 'height 0.4s cubic-bezier(0.4,0,0.2,1), min-height 0.4s cubic-bezier(0.4,0,0.2,1)',
              }}
              className="px-8 py-4 overflow-y-auto custom-scrollbar"
            >
              {step === 1 && (
                <div className="flex flex-col gap-6">
                  <div>
                    <label className="text-[14px] font-medium text-[#0a0a0a] mb-2 flex items-center gap-1">
                      Project name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={projectName}
                      onChange={(e) => {
                        setProjectName(e.target.value);
                        if (e.target.value) setHasError(false);
                      }}
                      placeholder="e.g. Riverside Apartment 4B"
                      className={`w-full h-[44px] px-4 rounded-xl border ${hasError ? 'border-red-500 bg-red-50' : 'border-gray-200'} focus:outline-none focus:ring-2 focus:ring-[#004643]/20 transition-all text-[14px] placeholder:text-gray-400`}
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
                      className="w-full h-[44px] px-4 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#004643]/20 transition-all text-[14px] placeholder:text-gray-400"
                    />
                  </div>
                </div>
              )}

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

              {step === 3 && (
                <div className="flex gap-[24px] h-full">
                  {/* Left side: Interactive map mock */}
                  <div className="bg-[#f7f8f8] border border-[#eaedec] h-full min-h-[350px] relative rounded-[12px] flex-1 overflow-hidden group">
                    <div className="absolute border-[3px] border-[#343837] inset-[20px] pointer-events-none z-10" />
                    <div className="absolute inset-[28px] flex gap-[7px]">
                      {rooms.length > 0 && (
                        <div className="flex flex-col gap-[7px] w-[43%]">
                          {rooms.slice(0, 1).map((room) => (
                            <div
                              key={room.id}
                              onClick={() => setSelectedRoomId(room.id)}
                              className={`border flex flex-col items-center justify-center relative rounded-[2px] flex-1 hover:opacity-80 transition-all cursor-pointer group/room overflow-hidden ${selectedRoomId === room.id ? 'border-[#004643] border-[2px] z-20 shadow-md scale-[1.02]' : 'border-[#8e9493]'}`}
                              style={{ backgroundColor: room.color + 'A6' }}
                            >
                              <p className="font-semibold text-[#004643] text-[13px] text-center px-1">{room.name}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {rooms.length > 1 && (
                        <div className="flex flex-col gap-[7px] w-[35%]">
                          {rooms.slice(1, 4).map((room, idx, arr) => (
                            <div
                              key={room.id}
                              onClick={() => setSelectedRoomId(room.id)}
                              className={`border flex flex-col items-center justify-center relative rounded-[2px] hover:opacity-80 transition-all cursor-pointer group/room overflow-hidden ${selectedRoomId === room.id ? 'border-[#004643] border-[2px] z-20 shadow-md scale-[1.02]' : 'border-[#8e9493]'}`}
                              style={{
                                height: arr.length === 3 ? (idx === 0 ? '20%' : idx === 1 ? '37%' : 'auto') : 'auto',
                                flex: (arr.length < 3 || idx === 2) ? 1 : 'none',
                                backgroundColor: room.color + 'A6'
                              }}
                            >
                              <p className="font-semibold text-[#004643] text-[13px] text-center px-1">{room.name}</p>
                            </div>
                          ))}
                        </div>
                      )}
                      {rooms.length > 4 && (
                        <div className="flex flex-col gap-[7px] w-[22%]">
                          {rooms.slice(4).map((room, idx, arr) => (
                            <div
                              key={room.id}
                              onClick={() => setSelectedRoomId(room.id)}
                              className={`border flex flex-col items-center justify-center relative rounded-[2px] hover:opacity-80 transition-all cursor-pointer group/room overflow-hidden ${selectedRoomId === room.id ? 'border-[#004643] border-[2px] z-20 shadow-md scale-[1.02]' : 'border-[#8e9493]'}`}
                              style={{
                                height: arr.length >= 3 ? (idx === 0 ? '43%' : idx === 1 ? '37%' : 'auto') : 'auto',
                                flex: (arr.length < 3 || idx >= 2) ? 1 : 'none',
                                backgroundColor: room.color + 'A6'
                              }}
                            >
                              <p className="font-semibold text-[#004643] text-[13px] text-center px-1">{room.name}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="absolute text-gray-500 text-[12px] right-[20px] bottom-[2px] font-medium tracking-[0.4px]">
                      Click a room to select
                    </p>
                  </div>

                  {/* Right side: Room list */}
                  <div className="bg-white border border-[#f1f4f4] h-full min-h-[350px] overflow-hidden relative rounded-[12px] w-[240px] shrink-0 flex flex-col">
                    <div className="bg-white border-b border-[#f1f4f4] flex items-center justify-between h-[44px] shrink-0 px-[16px]">
                      <p className="font-semibold text-[#101212] text-[13px]">{rooms.length} rooms</p>
                      <button onClick={handleAddRoom} className="font-semibold text-[#004643] text-[13px] hover:underline">+ Add</button>
                    </div>
                    <div className="overflow-y-auto flex-1 hide-scrollbar">
                      {rooms.map((room, index) => (
                        <div
                          key={room.id}
                          onClick={() => setSelectedRoomId(room.id)}
                          className={`h-[50px] relative flex items-center px-[16px] transition-colors cursor-pointer group/item ${index !== 0 ? 'border-t border-[#f1f4f4]' : ''} ${selectedRoomId === room.id ? 'bg-[#f4f7eb]' : 'bg-white hover:bg-gray-50'}`}
                        >
                          <div className="border border-[rgba(0,0,0,0.08)] rounded-[3px] w-[12px] h-[12px] shrink-0" style={{ backgroundColor: room.color }} />
                          <div className="ml-[12px] flex flex-col justify-center flex-1 pr-2">
                            <input
                              value={room.name}
                              onChange={(e) => handleRenameRoom(room.id, e.target.value)}
                              onClick={(e) => e.stopPropagation()}
                              className="font-medium text-[#101212] text-[13px] leading-tight bg-transparent border-none outline-none focus:ring-1 focus:ring-[#004643] rounded px-1 -ml-1 w-full"
                            />
                          </div>
                          <div className="flex items-center gap-1">
                            <p className={`font-medium text-[12px] leading-tight ${selectedRoomId === room.id ? 'hidden' : 'group-hover/item:hidden'}`} style={{ color: room.confidenceColor }}>
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
                      <button className="bg-gray-100 hover:bg-gray-200 text-[#0a0a0a] text-[13px] font-medium px-4 h-8 rounded-[8px] transition-colors">Apply</button>
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
                      {rooms.map(room => (
                        <div key={room.id} className="grid grid-cols-4 gap-4 px-5 py-2.5 items-center hover:bg-gray-50 transition-colors">
                          <div className="text-[13px] font-medium text-[#0a0a0a] truncate pr-2">{room.name}</div>
                          <div className="flex justify-center">
                            <input type="text" defaultValue={room.length} className="w-[54px] h-[28px] border border-gray-200 rounded-md text-center text-[13px] font-medium focus:border-[#004643] focus:outline-none focus:ring-1 focus:ring-[#004643] transition-colors" />
                          </div>
                          <div className="flex justify-center">
                            <input type="text" defaultValue={room.width} className="w-[54px] h-[28px] border border-gray-200 rounded-md text-center text-[13px] font-medium focus:border-[#004643] focus:outline-none focus:ring-1 focus:ring-[#004643] transition-colors" />
                          </div>
                          <div className="flex justify-center">
                            <input type="text" defaultValue={room.height} className="w-[54px] h-[28px] border border-gray-200 rounded-md text-center text-[13px] font-medium focus:border-[#004643] focus:outline-none focus:ring-1 focus:ring-[#004643] transition-colors" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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

            {/* ── Error Toast — just above the footer ── */}
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
                {step === 5 ? "Create Project" : "Continue"}
              </button>
            </div>
          </motion.div>
        </div>
      </AnimatePresence>

      {/* Full-screen creating overlay */}
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