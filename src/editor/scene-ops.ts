/**
 * نقطه ورود واحد برای همه scene-ops.
 */

// Object Operations
export { updateObjectOp, deleteObjectOp, focusObjectOp, duplicateObjectsOp } from "./scene-ops/objectOps.js";

// Scene Field Operations
export { updateSceneFieldOp } from "./scene-ops/sceneFieldOps.js";

// History Operations
export { undoOp, redoOp } from "./scene-ops/historyOps.js";

// Add Object / Texture Operations
export { addSpriteWithTextureOp, importTextureAtOp, importTextureDialogOp } from "./scene-ops/addObjectOps.js";
