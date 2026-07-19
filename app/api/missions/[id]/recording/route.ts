import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import { getMission, setMission } from "@/lib/store";
import { addMissionEvent } from "@/lib/missionEvents";

/**
 * POST /api/missions/[id]/recording
 *
 * Called by the frontend "Upload Call" button after a successful session 2.
 * Accepts a multipart/form-data upload with a single field named "file" (MP4).
 *
 * Saves the file to public/recordings/[missionId].mp4 so it is served
 * as a static asset at /recordings/[missionId].mp4.
 *
 * Transitions mission status: "negotiating" → "session_2_complete"
 *
 * If session 2 failed the user simply does not click the upload button —
 * the mission stays in "negotiating" state and nothing else happens.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const mission = getMission(id);
  if (!mission) {
    return NextResponse.json({ error: "Mission not found" }, { status: 404 });
  }

  if (mission.status !== "negotiating") {
    return NextResponse.json(
      {
        error: "Recording can only be uploaded after session 2 (status must be 'negotiating')",
        currentStatus: mission.status,
      },
      { status: 409 }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Could not parse multipart form data" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob)) {
    return NextResponse.json(
      { error: "A file field named 'file' is required" },
      { status: 422 }
    );
  }

  // Only accept video/mp4 or application/octet-stream (some browsers send this for .mp4)
  const allowedTypes = ["video/mp4", "application/octet-stream"];
  if (!allowedTypes.includes(file.type) && file.type !== "") {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type}. Expected video/mp4.` },
      { status: 415 }
    );
  }

  // Write to public/recordings/[missionId].mp4
  const recordingsDir = path.join(process.cwd(), "public", "recordings");
  await mkdir(recordingsDir, { recursive: true });

  const fileName = `${id}.mp4`;
  const filePath = path.join(recordingsDir, fileName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const recordingUrl = `/recordings/${fileName}`;

  mission.recordingUrl = recordingUrl;
  mission.status = "session_2_complete";
  addMissionEvent(mission, {
    event: "recording_uploaded",
    details: "Session 2 call recording saved.",
    category: "status",
  });

  setMission(mission);

  return NextResponse.json(
    { recordingUrl, status: "session_2_complete" },
    { status: 201 }
  );
}
