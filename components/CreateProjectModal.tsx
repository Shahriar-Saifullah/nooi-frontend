"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { X, UploadCloud, AlertCircle, Trash2, Pencil, Loader2, RefreshCw } from "lucide-react";
import { createProject, uploadFloorPlan, saveRooms, saveDimensions } from "@/lib/api/projects";
import type { Room as ApiRoom } from "@/lib/api/projects";
import { useProjectStore } from "@/lib/store";
import {
  RoomOverlayBox,
  assignGridPositions,
  relayoutGrid,
  type RoomBox,
} from "@/components/RoomLayoutGrid";

interface Room {
  id: string;
  name: string;
  confidence: string;
  length: string;
  width: string;
  height: string;
  color: string;
  confidenceColor: string;
  box?: RoomBox; // current position on the floor plan image, as % (top/left/width/height)
  polygon?: [number, number][]; // true room shape from the v3 pipeline (% coords)
  pxSize?: { w: number; h: number }; // room extent in image pixels (for scale auto-fill)
  originalBox?: RoomBox; // AI's original suggestion, kept so the user can reset after manual edits
  gridRow?: number; // which row this room belongs to in the layout grid
  gridCol?: number; // which column within that row
  rowWeight?: number; // height weight used to compute this room's row height share
  colWeight?: number; // width weight used to compute this room's column width share
  initialGridRow?: number; // grid position right after layout, before any manual edits
  initialGridCol?: number;
  initialRowWeight?: number;
  initialColWeight?: number;
}

interface CreateProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// ── Convert local Room state (string inputs, UI-only fields) to the shape the
// backend API expects (numbers, only the fields the schema knows about). Local
// fields like initialGridRow/initialColWeight are UI-only "reset" snapshots and
// are intentionally dropped here — the backend only needs the current layout.
function toApiRoom(room: Room): ApiRoom {
  const length = parseFloat(room.length);
  const width  = parseFloat(room.width);
  const height = parseFloat(room.height);
  const confidence = parseFloat(room.confidence);

  return {
    id:         room.id,
    name:       room.name,
    color:      room.color,
    confidence: Number.isFinite(confidence) ? confidence : undefined,
    length:     Number.isFinite(length) && length > 0 ? length : undefined,
    width:      Number.isFinite(width) && width > 0 ? width : undefined,
    height:     Number.isFinite(height) && height > 0 ? height : undefined,
    box:        room.box,
    polygon:    room.polygon,
    gridRow:    room.gridRow,
    gridCol:    room.gridCol,
    rowWeight:  room.rowWeight,
    colWeight:  room.colWeight,
  };
}

// ── One-input measurement calibration ─────────────────────────────────────────
// When the plan's dimension text is too low-res for auto-extraction, the
// pipeline still sends each room's pixel extents (px_size). The moment the
// user types ONE real measurement, we derive the metres-per-pixel scale and
// fill every still-empty field from the plan's true proportions.
function autoFillDimensions(
  rooms: Room[], editedId: string, field: "length" | "width", value: string,
): Room[] {
  const num = parseFloat(value);
  const edited = rooms.find(r => r.id === editedId);
  const px = edited?.pxSize;
  const base = field === "length" ? px?.h : px?.w;
  const updated = rooms.map(r => r.id === editedId ? { ...r, [field]: value } : r);
  if (!Number.isFinite(num) || num <= 0 || !base || base <= 0) return updated;
  const scale = num / base; // metres per image pixel
  return updated.map(r => {
    if (r.id === editedId || !r.pxSize) return r;
    return {
      ...r,
      length: r.length === "" ? (r.pxSize.h * scale).toFixed(1) : r.length,
      width:  r.width  === "" ? (r.pxSize.w * scale).toFixed(1) : r.width,
    };
  });
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
  const [dimsWarned, setDimsWarned] = useState(false);
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
        setDimsWarned(false);
        setApiError(null);
        setApiLoading(false);
        setRooms([]);
        setSelectedRoomId(null);
        setFloorPlanUrl(null);
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

    // Place the new room in its own row at the bottom of the grid, full width,
    // so it appears immediately on the layout instead of floating with no position.
    const existingRows = rooms
      .map(r => r.gridRow)
      .filter((r): r is number => r !== undefined);
    const newGridRow = existingRows.length > 0 ? Math.max(...existingRows) + 1 : 0;

    const newRoom: Room = {
      id:               newId,
      name:             `New Room ${rooms.length + 1}`,
      confidence:       "100%",
      length:           "3.0",
      width:            "3.0",
      height:           "2.4",
      color:            randomColor,
      confidenceColor:  "#b3b9b9",
      gridRow:          newGridRow,
      gridCol:          0,
      rowWeight:        40, // reasonable default weight, relative to existing rooms
      colWeight:        100,
      initialGridRow:   newGridRow,
      initialGridCol:   0,
      initialRowWeight: 40,
      initialColWeight: 100,
    };

    setRooms(relayoutGrid([...rooms, newRoom]));
  };

  const handleRenameRoom = (id: string, newName: string) => {
    setRooms(rooms.map(room => room.id === id ? { ...room, name: newName } : room));
  };

  const handleDeleteRoom = (id: string) => {
    const remaining = rooms.filter(room => room.id !== id);
    setRooms(relayoutGrid(remaining));
    if (selectedRoomId === id) setSelectedRoomId(null);
  };

  // Resizing a room updates its weight (not its raw box directly), then the whole
  // grid is relaid out from weights — so neighboring rooms automatically shrink/grow
  // to fill the remaining space and nothing ever overlaps.
  const handleResizeRoom = (id: string, box: RoomBox) => {
    const target = rooms.find(r => r.id === id);
    if (!target || target.gridRow === undefined) {
      // No grid position (manually added room with a free-form box) — just move it directly
      setRooms(rooms.map(room => room.id === id ? { ...room, box } : room));
      return;
    }

    const updatedRooms = rooms.map(room =>
      room.id === id
        ? { ...room, rowWeight: box.height, colWeight: box.width }
        : room
    );
    setRooms(relayoutGrid(updatedRooms));
  };

  // Dragging one room onto another swaps their row/col grid positions (and therefore
  // their box, color stays with the room, size weight swaps too) — never free-form
  // overlapping placement.
  const handleSwapRooms = (draggedId: string, targetId: string) => {
    if (draggedId === targetId) return;
    const dragged = rooms.find(r => r.id === draggedId);
    const target  = rooms.find(r => r.id === targetId);
    if (!dragged || !target || dragged.gridRow === undefined || target.gridRow === undefined) return;

    const updatedRooms = rooms.map(room => {
      if (room.id === draggedId) {
        return { ...room, gridRow: target.gridRow, gridCol: target.gridCol, rowWeight: target.rowWeight, colWeight: target.colWeight };
      }
      if (room.id === targetId) {
        return { ...room, gridRow: dragged.gridRow, gridCol: dragged.gridCol, rowWeight: dragged.rowWeight, colWeight: dragged.colWeight };
      }
      return room;
    });
    setRooms(relayoutGrid(updatedRooms));
  };

  const handleResetRoomBox = (id: string) => {
    const target = rooms.find(r => r.id === id);
    if (!target) return;

    if (target.initialGridRow === undefined) {
      // Manually added room with no grid position — fall back to raw box reset
      if (!target.originalBox) return;
      setRooms(rooms.map(room => room.id === id ? { ...room, box: { ...room.originalBox! } } : room));
      return;
    }

    // Find whichever room currently occupies this room's original grid slot,
    // so resetting one room cleanly swaps back rather than leaving two rooms
    // claiming the same slot.
    const occupant = rooms.find(r =>
      r.id !== id && r.gridRow === target.initialGridRow && r.gridCol === target.initialGridCol
    );

    const updatedRooms = rooms.map(room => {
      if (room.id === id) {
        return {
          ...room,
          gridRow:   target.initialGridRow,
          gridCol:   target.initialGridCol,
          rowWeight: target.initialRowWeight,
          colWeight: target.initialColWeight,
        };
      }
      if (occupant && room.id === occupant.id) {
        return {
          ...room,
          gridRow:   target.gridRow,
          gridCol:   target.gridCol,
          rowWeight: target.rowWeight,
          colWeight: target.colWeight,
        };
      }
      return room;
    });

    setRooms(relayoutGrid(updatedRooms));
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
        setProject({ id: project.id, name: project.name, floor_plan_url: null, floorPlanUrl: null });
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
          id:             projectId!,
          name:           projectName,
          floor_plan_url: result.floor_plan_url,
          floorPlanUrl:   result.floor_plan_url,
        });
        setFloorPlanUrl(result.floor_plan_url);

        // ── Use Gemini-detected rooms ──
        if (result.detected_rooms && result.detected_rooms.length > 0) {
          const mapped = result.detected_rooms.map((room: any) => ({
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
            polygon:         room.polygon || undefined,
            pxSize:          room.px_size || undefined,
            originalBox:     room.box || undefined,
          }));

          // Assign each room a row/column position based on its real detected layout,
          // then compute clean, evenly-spaced, non-overlapping pixel positions from that.
          const roomsWithBoxes: Room[] = mapped.filter((r: Room) => r.box);
          const roomsWithoutBoxes: Room[] = mapped.filter((r: Room) => !r.box);

          if (roomsWithBoxes.length > 0) {
            const assignments = assignGridPositions(roomsWithBoxes.map((r: Room) => r.box!));
            roomsWithBoxes.forEach((r: Room, i: number) => {
              r.gridRow   = assignments[i].gridRow;
              r.gridCol   = assignments[i].gridCol;
              r.rowWeight = assignments[i].rowSpanWeight;
              r.colWeight = assignments[i].colSpanWeight;
            });
            const laidOut = relayoutGrid(roomsWithBoxes);
            laidOut.forEach((r, i) => {
              roomsWithBoxes[i] = {
                ...r,
                initialGridRow:   r.gridRow,
                initialGridCol:   r.gridCol,
                initialRowWeight: r.rowWeight,
                initialColWeight: r.colWeight,
              };
            });
          }

          setRooms([...roomsWithBoxes, ...roomsWithoutBoxes]);
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

    // Step 3 — Confirm reviewed rooms (names, colors, layout) → persist to backend
    if (step === 3) {
      if (rooms.length === 0) {
        setApiError("Add at least one room before continuing");
        return;
      }
      try {
        setApiLoading(true);
        await saveRooms(projectId!, rooms.map(toApiRoom));
        setStep(4);
      } catch (err: any) {
        setApiError(err.message || "Failed to save rooms");
      } finally {
        setApiLoading(false);
      }
      return;
    }

    // Step 4 — Save dimensions → persist to backend (merges with rooms saved above)
    if (step === 4) {
      const missingDims = rooms.filter(r => !r.length || !r.width || !r.height);
      if (missingDims.length > 0 && !dimsWarned) {
        // warn once, but never block project creation on measurements —
        // rooms without dimensions simply won't have sizes until edited later
        setDimsWarned(true);
        setApiError(
          `No measurements for: ${missingDims.map(r => r.name).join(', ')}. ` +
          `You can continue without them — click Continue again to proceed.`
        );
        return;
      }
      setApiError(null);
      try {
        setApiLoading(true);
        await saveDimensions(projectId!, rooms.map(toApiRoom));
        setStep(5);
      } catch (err: any) {
        setApiError(err.message || "Failed to save dimensions");
      } finally {
        setApiLoading(false);
      }
      return;
    }

    // Step 5 — Confirm project → push final rooms into the store so the canvas
    // page can render the same interactive layout → navigate
    setIsCreating(true);
    setProject({
      id:             projectId!,
      name:           projectName,
      floor_plan_url: floorPlanUrl,
      floorPlanUrl:   floorPlanUrl,
      rooms:        rooms.map(toApiRoom),
    });
    setTimeout(() => {
      router.push("/canvas");
    }, 2000);
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
            className="bg-white rounded-[24px] w-full shadow-2xl flex flex-col overflow-hidden max-h-[calc(100vh-2rem)] sm:max-h-[85vh] h-auto sm:h-[580px] max-w-[620px] my-auto"
          >
            {/* Header */}
            <div className="flex justify-between items-start px-6 sm:px-8 pt-6 sm:pt-8 pb-3 sm:pb-4 shrink-0">
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
                  {step === 4 && "Enter measurements in metres. Fill in one room and the rest auto-fill from the plan's proportions."}
                  {step === 5 && "Review everything before we save your project."}
                </p>
              </div>
              <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 sm:px-8 py-3 sm:py-4 overflow-y-auto custom-scrollbar flex-1 min-h-0">

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
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 min-h-[280px] h-full">
                  {/* Room layout — colored boxes only, positioned to mirror the real floor plan's layout */}
                  <div
                    onClick={() => setSelectedRoomId(null)}
                    className="bg-[#f7f8f8] border border-[#eaedec] h-[240px] sm:h-full min-h-[220px] relative rounded-[12px] flex-1 overflow-hidden"
                  >
                    {rooms.length === 0 ? (
                      <div className="absolute inset-0 flex items-center justify-center">
                        <p className="text-gray-400 text-[13px] text-center px-4">
                          No rooms detected. Add rooms manually using the + Add button.
                        </p>
                      </div>
                    ) : (
                      <div data-overlay-root className="absolute inset-[16px]">
                        {rooms.filter(r => r.box).map((room) => (
                          <RoomOverlayBox
                            key={room.id}
                            room={room}
                            isSelected={selectedRoomId === room.id}
                            hasSelection={!!selectedRoomId}
                            onSelect={() => setSelectedRoomId(room.id)}
                            onResize={(box) => handleResizeRoom(room.id, box)}
                            onSwap={(targetId) => handleSwapRooms(room.id, targetId)}
                          />
                        ))}
                        {rooms.some(r => !r.box) && (
                          <div className="absolute bottom-0 left-0 right-0 text-gray-400 text-[11px] text-center px-3 py-1">
                            Some rooms have no position data — see list to the right
                          </div>
                        )}
                      </div>
                    )}

                    {rooms.length > 0 && (
                      <div className="absolute top-2 left-1/2 -translate-x-1/2 text-gray-500 text-[10px] text-center px-2.5 py-1 bg-white/90 rounded-full shadow-sm whitespace-nowrap z-30">
                        {selectedRoomId ? "Drag onto another room to swap places, or use corner handles to resize" : "Click a room to select and adjust its outline"}
                      </div>
                    )}
                    {(() => {
                      const selRoom = rooms.find(r => r.id === selectedRoomId);
                      const changed = selRoom && selRoom.initialGridRow !== undefined && (
                        selRoom.gridRow   !== selRoom.initialGridRow ||
                        selRoom.gridCol   !== selRoom.initialGridCol ||
                        selRoom.rowWeight !== selRoom.initialRowWeight ||
                        selRoom.colWeight !== selRoom.initialColWeight
                      );
                      if (!changed) return null;
                      return (
                        <button
                          onClick={() => handleResetRoomBox(selRoom!.id)}
                          className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[11px] font-medium text-[#004643] bg-white border border-[#c3f4f0] hover:bg-[#eaf8f4] px-3 py-1.5 rounded-full shadow-sm transition-colors z-30"
                        >
                          Reset to AI suggestion
                        </button>
                      );
                    })()}
                  </div>

                  {/* Room list — primary review/edit interaction */}
                  <div className="bg-white border border-[#f1f4f4] h-[200px] sm:h-full min-h-[180px] overflow-hidden relative rounded-[12px] w-full sm:w-[220px] shrink-0 flex flex-col">
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
                  {rooms.every(r => r.length === "" || r.width === "") && (
                    <div className="flex items-start gap-2 bg-[#fff8ec] border border-[#fde68a]/60 rounded-xl px-4 py-2.5">
                      <AlertCircle className="w-[16px] h-[16px] text-[#9c7b31] mt-[1px] shrink-0" />
                      <p className="text-[12px] text-[#7a5f23] leading-snug">
                        No room measurements were found printed on your floor plan, so all fields start blank — enter them manually below.
                      </p>
                    </div>
                  )}

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
                              onChange={(e) => setRooms(autoFillDimensions(rooms, room.id, "length", e.target.value))}
                              className="w-[54px] h-[28px] border border-gray-200 rounded-md text-center text-[13px] font-medium focus:border-[#004643] focus:outline-none focus:ring-1 focus:ring-[#004643] transition-colors"
                            />
                          </div>
                          <div className="flex justify-center">
                            <input
                              type="text"
                              value={room.width}
                              placeholder="—"
                              onChange={(e) => setRooms(autoFillDimensions(rooms, room.id, "width", e.target.value))}
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
                  className="mx-6 sm:mx-8 mb-2 flex items-center justify-between gap-2 text-red-600 bg-red-50 px-4 py-2.5 rounded-xl border border-red-100 shrink-0"
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
            <div className="border-t border-[#f1f4f4] px-6 sm:px-8 py-3.5 sm:py-4 flex items-center justify-between bg-white rounded-b-[24px] shrink-0 mt-auto">
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