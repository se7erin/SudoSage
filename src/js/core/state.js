/**
 * SudoSage - State Management Module
 * 
 * This module implements the state management foundation for the SudoSage application:
 * 1. Immutable state tree with structural sharing for efficient undo/redo
 * 2. Command pattern for action encapsulation
 * 3. State diffing for efficient updates
 * 
 * Performance target: O(1) for state access, O(log n) for history navigation
 */

import SudokuBoard from './board.js';

/**
 * State class representing the immutable state of the application
 */
export class State {
    /**
     * Create a new State
     * @param {Object} config - Configuration object
     * @param {SudokuBoard} config.board - The sudoku board
     * @param {number} config.difficulty - The difficulty level (1-5)
     * @param {number} config.timer - The timer in seconds
     * @param {boolean} config.isComplete - Whether the game is complete
     * @param {boolean} config.isPaused - Whether the game is paused
     */
    constructor({
        board = new SudokuBoard(),
        difficulty = 1,
        timer = 0,
        isComplete = false,
        isPaused = false,
    } = {}) {
        this.board = board;
        this.difficulty = difficulty;
        this.timer = timer;
        this.isComplete = isComplete;
        this.isPaused = isPaused;
        
        // Freeze the state to make it immutable
        Object.freeze(this);
    }
    
    /**
     * Create a new State with updated properties
     * @param {Object} updates - The properties to update
     * @returns {State} - A new State instance
     */
    update(updates = {}) {
        return new State({
            board: updates.board || this.board,
            difficulty: updates.difficulty !== undefined ? updates.difficulty : this.difficulty,
            timer: updates.timer !== undefined ? updates.timer : this.timer,
            isComplete: updates.isComplete !== undefined ? updates.isComplete : this.isComplete,
            isPaused: updates.isPaused !== undefined ? updates.isPaused : this.isPaused,
        });
    }
    
    /**
     * Serialize the state to JSON
     * @returns {Object} - The serialized state
     */
    toJSON() {
        return {
            board: this.board.serialize(),
            difficulty: this.difficulty,
            timer: this.timer,
            isComplete: this.isComplete,
            isPaused: this.isPaused,
        };
    }
    
    /**
     * Create a State from a serialized JSON object
     * @param {Object} json - The serialized state
     * @returns {State} - A new State instance
     */
    static fromJSON(json) {
        return new State({
            board: SudokuBoard.deserialize(json.board),
            difficulty: json.difficulty,
            timer: json.timer,
            isComplete: json.isComplete,
            isPaused: json.isPaused,
        });
    }
}

/**
 * Command base class representing an action that can be executed, undone, and redone
 */
export class Command {
    /**
     * Execute the command
     * @param {State} state - The current state
     * @returns {State} - The new state
     */
    execute(state) {
        throw new Error("Command.execute() must be implemented by subclasses");
    }
    
    /**
     * Invert the command (for undo)
     * @returns {Command} - The inverted command, or null if not invertible
     */
    invert() {
        throw new Error("Command.invert() must be implemented by subclasses");
    }
}

/**
 * Command to set a value in a cell
 */
export class SetValueCommand extends Command {
    /**
     * Create a new SetValueCommand
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {number} value - Value to set
     */
    constructor(row, col, value) {
        super();
        this.row = row;
        this.col = col;
        this.value = value;
        this.previousValue = null;
        this.previousCandidates = [];
    }
    
    /**
     * Execute the command
     * @param {State} state - Current state
     * @returns {State} New state after setting the value
     */
    execute(state) {
        // Store the previous value and candidates for undo
        const board = state.board;
        this.previousValue = board.grid[this.row][this.col];
        this.previousCandidates = board.getCandidates(this.row, this.col);
        
        // If the cell already has this value, do nothing
        if (this.previousValue === this.value) {
            return state;
        }
        
        // If the cell is a given, do nothing
        if (board.isGiven[this.row][this.col]) {
            return state;
        }
        
        // Create a new board with the value set
        const newBoard = state.board.clone();
        newBoard.setValue(this.row, this.col, this.value);
        
        // Check if the board is complete
        const isComplete = newBoard.isComplete();
        
        return state.update({ 
            board: newBoard,
            isComplete
        });
    }
    
    /**
     * Invert the command (for undo)
     * @returns {Command} Inverted command
     */
    invert() {
        if (this.previousValue > 0) {
            // If there was a previous value, restore it
            return new SetValueCommand(this.row, this.col, this.previousValue);
        } else {
            // If the cell was empty, clear it and restore candidates
            const command = new ClearValueCommand(this.row, this.col);
            command.candidates = this.previousCandidates;
            return command;
        }
    }
}

/**
 * Command to clear a value from a cell
 */
export class ClearValueCommand extends Command {
    /**
     * Create a new ClearValueCommand
     * @param {number} row - Row index
     * @param {number} col - Column index
     */
    constructor(row, col) {
        super();
        this.row = row;
        this.col = col;
        this.previousValue = null;
        this.candidates = [];
    }
    
    /**
     * Execute the command
     * @param {State} state - Current state
     * @returns {State} New state after clearing the value
     */
    execute(state) {
        const board = state.board;
        this.previousValue = board.grid[this.row][this.col];
        
        // If the cell is already empty, do nothing
        if (this.previousValue === 0) {
            return state;
        }
        
        // If the cell is a given, do nothing
        if (board.isGiven[this.row][this.col]) {
            return state;
        }
        
        // Create a new board with the value cleared
        const newBoard = state.board.clone();
        newBoard.setValue(this.row, this.col, 0);
        
        // Restore candidates if provided
        if (this.candidates && this.candidates.length > 0) {
            for (const candidate of this.candidates) {
                newBoard.addCandidate(this.row, this.col, candidate);
            }
        }
        
        return state.update({ 
            board: newBoard,
            isComplete: false
        });
    }
    
    /**
     * Invert the command (for undo)
     * @returns {Command} Inverted command
     */
    invert() {
        return new SetValueCommand(this.row, this.col, this.previousValue);
    }
}

/**
 * Command to set or remove a note (candidate) in a cell
 */
export class SetNotesCommand extends Command {
    /**
     * Create a new SetNotesCommand
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {number} value - Value to set/remove as a note
     * @param {boolean} isAdd - Whether to add or remove the note
     */
    constructor(row, col, value, isAdd) {
        super();
        this.row = row;
        this.col = col;
        this.value = value;
        this.isAdd = isAdd;
        this.previousState = null;
    }
    
    /**
     * Execute the command
     * @param {State} state - Current state
     * @returns {State} New state after setting/removing the note
     */
    execute(state) {
        const board = state.board;
        
        // If the cell has a value, do nothing
        if (board.grid[this.row][this.col] !== 0) {
            return state;
        }
        
        // Store the previous state
        this.previousState = {
            candidates: board.getCandidates(this.row, this.col)
        };
        
        // Create a new board with the note updated
        const newBoard = state.board.clone();
        
        if (this.isAdd) {
            newBoard.addCandidate(this.row, this.col, this.value);
        } else {
            newBoard.removeCandidate(this.row, this.col, this.value);
        }
        
        return state.update({ board: newBoard });
    }
    
    /**
     * Invert the command (for undo)
     * @returns {Command} Inverted command
     */
    invert() {
        return new SetNotesCommand(this.row, this.col, this.value, !this.isAdd);
    }
}

/**
 * Command to reset the board
 */
export class ResetCommand extends Command {
    /**
     * Execute the command
     * @param {State} state - Current state
     * @returns {State} New state after resetting
     */
    execute(state) {
        const newBoard = state.board.clone();
        
        // Reset the board (clear all non-given values and candidates)
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                if (!newBoard.isGiven[row][col]) {
                    newBoard.setValue(row, col, 0);
                }
            }
        }
        
        return state.update({ 
            board: newBoard,
            isComplete: false
        });
    }
    
    /**
     * Invert the command (for undo)
     * @returns {Command} No invertion for reset
     */
    invert() {
        // Reset cannot be inverted
        return null;
    }
}

/**
 * Command to start a new game
 */
export class NewGameCommand extends Command {
    /**
     * Create a new NewGameCommand
     * @param {SudokuBoard} board - The new board
     * @param {number} difficulty - The difficulty level
     */
    constructor(board, difficulty) {
        super();
        this.board = board;
        this.difficulty = difficulty;
        this.previousState = null;
    }
    
    /**
     * Execute the command
     * @param {State} state - Current state
     * @returns {State} New state after starting a new game
     */
    execute(state) {
        // Store the previous state
        this.previousState = state;
        
        // Create a new state with the new board
        return new State({
            board: this.board.clone(),
            difficulty: this.difficulty,
            timer: 0,
            isComplete: false,
            isPaused: false
        });
    }
    
    /**
     * Invert the command (for undo)
     * @returns {Command} No inversion for new game
     */
    invert() {
        // New game cannot be inverted
        return null;
    }
}

/**
 * Manages the state of the application
 */
export class StateManager {
    /**
     * Create a new StateManager
     * @param {State} initialState - Initial state
     */
    constructor(initialState) {
        this._state = initialState || new State();
        this._commands = [];
        this._index = -1;
        this._subscribers = [];
    }
    
    /**
     * Get the current state
     * @returns {State} Current state
     */
    getState() {
        return this._state;
    }
    
    /**
     * Check if undo is available
     * @returns {boolean} Whether undo is available
     */
    canUndo() {
        return this._index >= 0;
    }
    
    /**
     * Check if redo is available
     * @returns {boolean} Whether redo is available
     */
    canRedo() {
        return this._index < this._commands.length - 1;
    }
    
    /**
     * Execute a command
     * @param {Command} command - Command to execute
     * @returns {void}
     */
    execute(command) {
        // Execute the command
        const newState = command.execute(this._state);
        
        // If the state didn't change, do nothing
        if (newState === this._state) {
            return;
        }
        
        // Update the state
        this._setState(newState);
        
        // Clear any redo commands
        if (this._index < this._commands.length - 1) {
            this._commands = this._commands.slice(0, this._index + 1);
        }
        
        // Add the command to the history
        this._commands.push(command);
        this._index++;
    }
    
    /**
     * Undo the last command
     * @returns {void}
     */
    undo() {
        if (!this.canUndo()) {
            return;
        }
        
        const command = this._commands[this._index];
        const invertCommand = command.invert();
        
        if (invertCommand) {
            const newState = invertCommand.execute(this._state);
            this._setState(newState);
        }
        
        this._index--;
    }
    
    /**
     * Redo the last undone command
     * @returns {void}
     */
    redo() {
        if (!this.canRedo()) {
            return;
        }
        
        this._index++;
        const command = this._commands[this._index];
        const newState = command.execute(this._state);
        this._setState(newState);
    }
    
    /**
     * Set a value in a cell
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {number} value - Value to set
     * @returns {void}
     */
    setValue(row, col, value) {
        this.execute(new SetValueCommand(row, col, value));
    }
    
    /**
     * Clear a value from a cell
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @returns {void}
     */
    clearValue(row, col) {
        this.execute(new ClearValueCommand(row, col));
    }
    
    /**
     * Set or remove a note in a cell
     * @param {number} row - Row index
     * @param {number} col - Column index
     * @param {number} value - Value to set/remove as a note
     * @param {boolean} isAdd - Whether to add or remove the note
     * @returns {void}
     */
    setNote(row, col, value, isAdd) {
        this.execute(new SetNotesCommand(row, col, value, isAdd));
    }
    
    /**
     * Reset the board
     * @returns {void}
     */
    reset() {
        this.execute(new ResetCommand());
    }
    
    /**
     * Start a new game
     * @param {SudokuBoard} board - The new board
     * @param {number} difficulty - The difficulty level
     * @returns {void}
     */
    newGame(board, difficulty) {
        this.execute(new NewGameCommand(board, difficulty));
    }
    
    /**
     * Subscribe to state changes
     * @param {Function} callback - Function to call when state changes
     * @returns {Function} Unsubscribe function
     */
    subscribe(callback) {
        this._subscribers.push(callback);
        return () => {
            this._subscribers = this._subscribers.filter(cb => cb !== callback);
        };
    }
    
    /**
     * Set the state and notify subscribers
     * @param {State} state - New state
     * @private
     */
    _setState(state) {
        // Create a diff between previous and new state
        const diff = this._calculateStateDiff(this._state, state);
        
        // Update the state
        this._state = state;
        
        // Notify subscribers
        for (const callback of this._subscribers) {
            try {
                callback(state, diff);
            } catch (error) {
                console.error('Error in state subscriber:', error);
            }
        }
    }
    
    /**
     * Create a diff object between two states
     * @param {State} oldState - Previous state
     * @param {State} newState - New state
     * @returns {Object} Diff object
     * @private
     */
    _calculateStateDiff(oldState, newState) {
        const changedCells = [];
        const changedProperties = [];
        
        // Compare boards
        if (oldState && oldState.board && newState.board) {
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    const oldValue = oldState.board.grid[row][col];
                    const newValue = newState.board.grid[row][col];
                    
                    if (oldValue !== newValue) {
                        changedCells.push({ row, col, oldValue, newValue });
                    }
                }
            }
        }
        
        // Compare other properties
        for (const prop of ['difficulty', 'timer', 'isComplete', 'isPaused']) {
            if (oldState && oldState[prop] !== newState[prop]) {
                changedProperties.push({
                    property: prop,
                    oldValue: oldState[prop],
                    newValue: newState[prop]
                });
            }
        }
        
        return { changedCells, changedProperties };
    }
    
    /**
     * Serialize the current state
     * @returns {Object} Serialized state
     */
    serialize() {
        return this._state.toJSON();
    }
    
    /**
     * Create a StateManager from serialized state
     * @param {Object} data - Serialized state
     * @returns {StateManager} Recreated state manager
     */
    static deserialize(data) {
        return new StateManager(State.fromJSON(data));
    }
}

export default StateManager; 