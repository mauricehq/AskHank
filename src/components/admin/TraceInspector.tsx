"use client";

import { useState } from "react";
import type { Id } from "../../../convex/_generated/dataModel";
import { ConversationPicker } from "./ConversationPicker";
import { TraceTimeline } from "./TraceTimeline";

export function TraceInspector() {
  const [selectedId, setSelectedId] = useState<Id<"conversations"> | null>(
    null
  );

  return (
    <div className="space-y-6">
      <ConversationPicker selectedId={selectedId} onSelect={setSelectedId} />
      {selectedId ? (
        <TraceTimeline conversationId={selectedId} />
      ) : (
        <div className="text-sm text-text-secondary">
          Select a conversation to view traces.
        </div>
      )}
    </div>
  );
}
