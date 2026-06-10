const DEFAULT_MAX_SNAPSHOTS = 50;

function cloneSnapshot(state) {
  return JSON.parse(JSON.stringify(state));
}

export function createHistory(initialState, maxSnapshots = DEFAULT_MAX_SNAPSHOTS) {
  let snapshots = [cloneSnapshot(initialState)];
  let index = 0;

  function current() {
    return cloneSnapshot(snapshots[index]);
  }

  function push(state) {
    snapshots = snapshots.slice(0, index + 1);
    snapshots.push(cloneSnapshot(state));

    if (snapshots.length > maxSnapshots) {
      snapshots = snapshots.slice(snapshots.length - maxSnapshots);
    }

    index = snapshots.length - 1;
    return current();
  }

  function undo() {
    if (index > 0) {
      index -= 1;
    }

    return current();
  }

  function redo() {
    if (index < snapshots.length - 1) {
      index += 1;
    }

    return current();
  }

  function canUndo() {
    return index > 0;
  }

  function canRedo() {
    return index < snapshots.length - 1;
  }

  function reset(state) {
    snapshots = [cloneSnapshot(state)];
    index = 0;
    return current();
  }

  return {
    current,
    push,
    undo,
    redo,
    canUndo,
    canRedo,
    reset,
  };
}
