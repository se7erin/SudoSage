/**
 * Unit tests for the state management module
 */
import { 
    State,
    StateManager, 
    Command, 
    SetValueCommand, 
    ClearValueCommand, 
    SetNotesCommand, 
    ResetCommand, 
    NewGameCommand 
} from './state.js';
import SudokuBoard from './board.js';

// Simple test helpers
const assert = (condition, message) => {
    if (!condition) {
        throw new Error(message || 'Assertion failed');
    }
};

const assertEqual = (actual, expected, message) => {
    if (actual !== expected) {
        throw new Error(`${message || 'Assertion failed'}: expected ${expected}, got ${actual}`);
    }
};

// Run the tests
function runTests() {
    console.log('Running StateManager tests...');
    
    testStateManager();
    testSetValueCommand();
    testClearValueCommand();
    testSetNotesCommand();
    testResetCommand();
    testUndoRedo();
    testSerialization();
    
    console.log('All state management tests passed!');
}

// Test StateManager initialization
function testStateManager() {
    console.log('Testing StateManager initialization...');
    
    // Test default constructor
    const stateManager = new StateManager();
    const state = stateManager.getState();
    
    assert(state.board instanceof SudokuBoard, 'Board should be an instance of SudokuBoard');
    assertEqual(state.difficulty, 1, 'Default difficulty should be 1');
    assertEqual(state.timer, 0, 'Initial timer should be 0');
    assertEqual(state.isComplete, false, 'isComplete should be false initially');
    assertEqual(state.isPaused, false, 'isPaused should be false initially');
    
    // Test constructor with initial state
    const initialBoard = new SudokuBoard();
    initialBoard.setValue(0, 0, 5);
    
    const initialState = new State({
        board: initialBoard,
        difficulty: 3,
        timer: 60,
        isComplete: false,
        isPaused: true
    });
    
    const stateManager2 = new StateManager(initialState);
    const state2 = stateManager2.getState();
    
    assertEqual(state2.board.grid[0][0], 5, 'Board should be set from initial state');
    assertEqual(state2.difficulty, 3, 'Difficulty should be set');
    assertEqual(state2.timer, 60, 'Timer should be set');
    assertEqual(state2.isPaused, true, 'isPaused should be set');
    
    console.log('StateManager initialization tests passed!');
}

// Test SetValueCommand
function testSetValueCommand() {
    console.log('Testing SetValueCommand...');
    
    const stateManager = new StateManager();
    
    // Test setValue
    stateManager.setValue(0, 0, 5);
    const state1 = stateManager.getState();
    assertEqual(state1.board.grid[0][0], 5, 'Value should be set');
    
    // Test invalid setValue (duplicate in row)
    stateManager.setValue(0, 1, 5);
    const state2 = stateManager.getState();
    assertEqual(state2.board.grid[0][1], 0, 'Invalid value should not be set');
    
    // Test valid setValue
    stateManager.setValue(0, 1, 3);
    const state3 = stateManager.getState();
    assertEqual(state3.board.grid[0][1], 3, 'Value should be set');
    
    console.log('SetValueCommand tests passed!');
}

// Test ClearValueCommand
function testClearValueCommand() {
    console.log('Testing ClearValueCommand...');
    
    const stateManager = new StateManager();
    
    // Set a value
    stateManager.setValue(0, 0, 5);
    
    // Test clearValue
    stateManager.clearValue(0, 0);
    const state1 = stateManager.getState();
    assertEqual(state1.board.grid[0][0], 0, 'Value should be cleared');
    
    // Test clearing an empty cell (should not change state)
    const beforeState = stateManager.getState();
    stateManager.clearValue(0, 0);
    const state2 = stateManager.getState();
    assert(state2 === beforeState, 'State should not change when clearing empty cell');
    
    // Set a given value
    const givenBoard = new SudokuBoard();
    givenBoard.setValue(1, 1, 6, true);
    const givenState = new State({ board: givenBoard });
    const stateManager2 = new StateManager(givenState);
    
    // Try to clear a given value
    stateManager2.clearValue(1, 1);
    const state3 = stateManager2.getState();
    assertEqual(state3.board.grid[1][1], 6, 'Given value should not be cleared');
    
    console.log('ClearValueCommand tests passed!');
}

// Test SetNotesCommand
function testSetNotesCommand() {
    console.log('Testing SetNotesCommand...');
    
    const stateManager = new StateManager();
    
    // Test setting a note
    stateManager.setNote(0, 0, 3, true);
    const state1 = stateManager.getState();
    const candidates1 = state1.board.getCandidates(0, 0);
    assert(candidates1.includes(3), 'Note should be set');
    
    // Test removing a note
    stateManager.setNote(0, 0, 3, false);
    const state2 = stateManager.getState();
    const candidates2 = state2.board.getCandidates(0, 0);
    assert(!candidates2.includes(3), 'Note should be removed');
    
    // Set a value and try to set a note (should not change)
    stateManager.setValue(1, 1, 5);
    const stateBefore = stateManager.getState();
    stateManager.setNote(1, 1, 3, true);
    const state3 = stateManager.getState();
    assert(state3 === stateBefore, 'Cannot set notes in a cell with a value');
    
    console.log('SetNotesCommand tests passed!');
}

// Test ResetCommand
function testResetCommand() {
    console.log('Testing ResetCommand...');
    
    const stateManager = new StateManager();
    
    // Set some values
    stateManager.setValue(0, 0, 5);
    stateManager.setValue(0, 1, 3);
    
    // Set a given value
    const stateBefore = stateManager.getState();
    stateBefore.board.setValue(1, 1, 6, true);
    
    // Reset the board
    stateManager.reset();
    const state1 = stateManager.getState();
    
    // Check that non-given values are cleared
    assertEqual(state1.board.grid[0][0], 0, 'Non-given values should be cleared');
    assertEqual(state1.board.grid[0][1], 0, 'Non-given values should be cleared');
    
    // Check that given values remain
    assertEqual(state1.board.grid[1][1], 6, 'Given values should remain');
    
    console.log('ResetCommand tests passed!');
}

// Test Undo/Redo
function testUndoRedo() {
    console.log('Testing Undo/Redo...');
    
    const stateManager = new StateManager();
    
    // Initially, undo/redo should not be available
    assert(!stateManager.canUndo(), 'Undo should not be available initially');
    assert(!stateManager.canRedo(), 'Redo should not be available initially');
    
    // Make some moves
    stateManager.setValue(0, 0, 5);
    stateManager.setValue(0, 1, 3);
    
    // Now undo should be available
    assert(stateManager.canUndo(), 'Undo should be available after moves');
    assert(!stateManager.canRedo(), 'Redo should not be available after moves');
    
    // Undo a move
    stateManager.undo();
    const undoState = stateManager.getState();
    assertEqual(undoState.board.grid[0][1], 0, 'Value should be undone');
    
    // Now redo should be available
    assert(stateManager.canUndo(), 'Undo should still be available');
    assert(stateManager.canRedo(), 'Redo should be available after undo');
    
    // Redo the move
    stateManager.redo();
    const redoState = stateManager.getState();
    assertEqual(redoState.board.grid[0][1], 3, 'Value should be restored');
    
    // Undo back to the beginning
    stateManager.undo();
    stateManager.undo();
    assert(!stateManager.canUndo(), 'Undo should not be available at beginning');
    assert(stateManager.canRedo(), 'Redo should be available at beginning');
    
    // Undoing when no history should not change state
    const stateBefore = stateManager.getState();
    stateManager.undo();
    const undoEmptyState = stateManager.getState();
    assert(undoEmptyState === stateBefore, 'Undoing with no history should not change state');
    
    console.log('Undo/Redo tests passed!');
}

// Test Serialization
function testSerialization() {
    console.log('Testing Serialization...');
    
    const stateManager = new StateManager();
    
    // Set some values
    stateManager.setValue(0, 0, 5);
    stateManager.setValue(0, 1, 3);
    
    // Set a given value
    const stateBefore = stateManager.getState();
    stateBefore.board.setValue(1, 1, 6, true);
    
    // Serialize the state
    const serialized = stateManager.serialize();
    assert(typeof serialized === 'object', 'Serialized state should be an object');
    
    // Deserialize
    const deserializedManager = StateManager.deserialize(serialized);
    const deserializedState = deserializedManager.getState();
    
    assert(deserializedState.board instanceof SudokuBoard, 'Deserialized board should be a SudokuBoard');
    assertEqual(deserializedState.difficulty, stateManager.getState().difficulty, 'Difficulty should be preserved');
    
    // Check board values
    assertEqual(deserializedState.board.grid[0][0], 5, 'Board values should be preserved');
    assertEqual(deserializedState.board.grid[0][1], 3, 'Board values should be preserved');
    assertEqual(deserializedState.board.grid[1][1], 6, 'Board values should be preserved');
    
    // Check given cells
    assert(deserializedState.board.isGiven[1][1], 'Given cells should be preserved');
    assert(!deserializedState.board.isGiven[0][0], 'Non-given cells should remain non-given');
    
    console.log('Serialization tests passed!');
}

// Run all tests
runTests(); 