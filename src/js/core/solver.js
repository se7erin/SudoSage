/**
 * SudoSage - Solver Module
 * 
 * This module implements algorithms for solving Sudoku puzzles:
 * 1. Constraint propagation system using bitwise operations
 * 2. Dancing Links (DLX) algorithm foundation for efficient exact cover
 * 3. Algorithmic hooks for strategy detection
 * 
 * Performance target: O(1) for constraint checks, efficient backtracking for solving
 */

import SudokuBoard from './board.js';

/**
 * SudokuSolver class - Implements various solving algorithms for Sudoku puzzles
 */
export class SudokuSolver {
    /**
     * Create a new solver instance
     * @param {SudokuBoard} [board] - Optional board to solve
     */
    constructor(board = null) {
        this.board = board || new SudokuBoard();
        this.steps = []; // Stores solving steps for strategy detection
        this.difficulty = 0; // Calculated difficulty level
    }
    
    /**
     * Set the board to solve
     * @param {SudokuBoard} board - The board to solve
     */
    setBoard(board) {
        this.board = board.clone();
        this.steps = [];
        this.difficulty = 0;
    }
    
    /**
     * Solve the current board using backtracking with constraint propagation
     * @param {Object} [options] - Solver options
     * @param {boolean} [options.recordSteps=false] - Whether to record solving steps
     * @param {boolean} [options.findAll=false] - Whether to find all solutions
     * @returns {Object} Solution information including solved board and count
     */
    solve(options = {}) {
        const { recordSteps = false, findAll = false } = options;
        
        if (!this.board) {
            throw new Error('No board to solve');
        }
        
        // Clone the board to avoid modifying the original
        const workingBoard = this.board.clone();
        const solutions = [];
        this.steps = [];
        
        // Check if board is valid before solving
        if (!workingBoard.isValid()) {
            return { solved: false, solutions: [], count: 0, reason: 'Invalid initial board' };
        }
        
        // Try to solve using constraint propagation first
        const propagationResult = this._constraintPropagation(workingBoard, recordSteps);
        
        // If the board is already solved or unsolvable after propagation
        if (propagationResult.solved || propagationResult.impossible) {
            return {
                solved: propagationResult.solved,
                solutions: propagationResult.solved ? [workingBoard] : [],
                count: propagationResult.solved ? 1 : 0,
                reason: propagationResult.impossible ? 'Impossible board' : null
            };
        }
        
        // If not solved by propagation, use backtracking
        const backtrackResult = this._backtrackingSolve(
            workingBoard, 
            recordSteps,
            findAll ? solutions : null
        );
        
        // If not finding all solutions, return the first one
        if (!findAll) {
            return {
                solved: backtrackResult.solved,
                solutions: backtrackResult.solved ? [backtrackResult.board] : [],
                count: backtrackResult.solved ? 1 : 0,
                reason: backtrackResult.reason
            };
        }
        
        // Return all solutions
        return {
            solved: solutions.length > 0,
            solutions,
            count: solutions.length,
            reason: solutions.length === 0 ? 'No solutions found' : null
        };
    }
    
    /**
     * Perform constraint propagation on the board
     * Uses the AC-3 algorithm (Arc Consistency Algorithm)
     * @param {SudokuBoard} board - The board to apply constraint propagation to
     * @param {boolean} recordSteps - Whether to record steps
     * @returns {Object} Result of propagation
     * @private
     */
    _constraintPropagation(board, recordSteps) {
        let changed = true;
        let impossible = false;
        
        // Continue propagating constraints until no more changes
        while (changed) {
            changed = false;
            let nakedSinglesFound = false;
            let hiddenSinglesFound = false;
            
            // Naked singles: cells with only one possible value
            for (let row = 0; row < 9; row++) {
                for (let col = 0; col < 9; col++) {
                    // Skip filled cells
                    if (board.grid[row][col] !== 0) continue;
                    
                    // Get candidates for this cell
                    const candidates = board.getCandidates(row, col);
                    
                    // If only one candidate, set it
                    if (candidates.length === 1) {
                        const value = candidates[0];
                        
                        if (recordSteps) {
                            this.steps.push({
                                type: 'naked_single',
                                row,
                                col,
                                value,
                                description: `Naked Single: Cell [${row},${col}] must be ${value}`
                            });
                        }
                        
                        board.setValue(row, col, value);
                        changed = true;
                        nakedSinglesFound = true;
                    } else if (candidates.length === 0) {
                        // If no candidates, the board is impossible
                        impossible = true;
                        return { solved: false, impossible: true };
                    }
                }
            }
            
            // Hidden singles: a value that can only go in one cell in a unit
            if (!nakedSinglesFound) {
                // Check each row, column, and box
                for (let unit = 0; unit < 9; unit++) {
                    // Check rows
                    hiddenSinglesFound = this._findHiddenSingles(board, 'row', unit, recordSteps) || hiddenSinglesFound;
                    
                    // Check columns
                    hiddenSinglesFound = this._findHiddenSingles(board, 'column', unit, recordSteps) || hiddenSinglesFound;
                    
                    // Check boxes
                    hiddenSinglesFound = this._findHiddenSingles(board, 'box', unit, recordSteps) || hiddenSinglesFound;
                }
                
                if (hiddenSinglesFound) {
                    changed = true;
                }
            }
            
            // If no progress made, break the loop
            if (!nakedSinglesFound && !hiddenSinglesFound) {
                break;
            }
        }
        
        // Check if the board is solved
        const solved = board.isComplete();
        
        return { solved, impossible };
    }
    
    /**
     * Find hidden singles in a unit (row, column, or box)
     * @param {SudokuBoard} board - The board to check
     * @param {string} unitType - Type of unit ('row', 'column', or 'box')
     * @param {number} unitIndex - Index of the unit (0-8)
     * @param {boolean} recordSteps - Whether to record steps
     * @returns {boolean} Whether any hidden singles were found
     * @private
     */
    _findHiddenSingles(board, unitType, unitIndex, recordSteps) {
        const valueCells = Array(10).fill().map(() => []); // Index by value (1-9)
        let found = false;
        
        // Collect all possible cells for each value in this unit
        for (let i = 0; i < 9; i++) {
            let row, col;
            
            // Determine the cell coordinates based on unit type
            if (unitType === 'row') {
                row = unitIndex;
                col = i;
            } else if (unitType === 'column') {
                row = i;
                col = unitIndex;
            } else if (unitType === 'box') {
                row = Math.floor(unitIndex / 3) * 3 + Math.floor(i / 3);
                col = (unitIndex % 3) * 3 + (i % 3);
            }
            
            // Skip filled cells
            if (board.grid[row][col] !== 0) continue;
            
            // Get candidates for this cell
            const candidates = board.getCandidates(row, col);
            
            // Add this cell to possible locations for each candidate
            for (const value of candidates) {
                valueCells[value].push({ row, col });
            }
        }
        
        // Check each value (1-9)
        for (let value = 1; value <= 9; value++) {
            // If this value can only go in one cell in this unit, it's a hidden single
            if (valueCells[value].length === 1) {
                const { row, col } = valueCells[value][0];
                
                if (recordSteps) {
                    this.steps.push({
                        type: 'hidden_single',
                        row,
                        col,
                        value,
                        unitType,
                        unitIndex,
                        description: `Hidden Single: ${value} can only go in cell [${row},${col}] in ${unitType} ${unitIndex}`
                    });
                }
                
                board.setValue(row, col, value);
                found = true;
            }
        }
        
        return found;
    }
    
    /**
     * Solve the board using backtracking with constraint propagation
     * @param {SudokuBoard} board - The board to solve
     * @param {boolean} recordSteps - Whether to record steps
     * @param {Array} [allSolutions] - Array to store all solutions if finding multiple
     * @returns {Object} Solution information
     * @private
     */
    _backtrackingSolve(board, recordSteps, allSolutions = null) {
        // Find the best cell to try (MRV - Minimum Remaining Values)
        const cell = this._findBestCell(board);
        
        // If no empty cells, the board is solved
        if (!cell) {
            if (allSolutions) {
                allSolutions.push(board.clone());
                return { solved: true, board: null };
            }
            return { solved: true, board };
        }
        
        const { row, col, candidates } = cell;
        
        // Try each candidate
        for (const value of candidates) {
            // Clone the board to avoid modifying the original
            const newBoard = board.clone();
            
            // Set the value
            if (recordSteps) {
                this.steps.push({
                    type: 'backtrack_try',
                    row,
                    col,
                    value,
                    description: `Trying ${value} in cell [${row},${col}]`
                });
            }
            
            newBoard.setValue(row, col, value);
            
            // Apply constraint propagation
            const propagationResult = this._constraintPropagation(newBoard, recordSteps);
            
            // If propagation made the board impossible, try next value
            if (propagationResult.impossible) {
                if (recordSteps) {
                    this.steps.push({
                        type: 'backtrack_fail',
                        row,
                        col,
                        value,
                        description: `Failed: ${value} in cell [${row},${col}] creates an impossible board`
                    });
                }
                continue;
            }
            
            // If board solved by propagation, return it
            if (propagationResult.solved) {
                if (allSolutions) {
                    allSolutions.push(newBoard.clone());
                    continue; // Keep looking for more solutions
                }
                return { solved: true, board: newBoard };
            }
            
            // Recursively continue solving
            const result = this._backtrackingSolve(newBoard, recordSteps, allSolutions);
            
            // If solution found and not finding all solutions, return it
            if (result.solved && !allSolutions) {
                return result;
            }
        }
        
        // If looking for all solutions and some were found, the search is successful
        if (allSolutions && allSolutions.length > 0) {
            return { solved: true, board: null };
        }
        
        // If no solution found, backtrack
        if (recordSteps) {
            this.steps.push({
                type: 'backtrack',
                row,
                col,
                description: `Backtracking from cell [${row},${col}]`
            });
        }
        
        return { solved: false, reason: 'No valid solution' };
    }
    
    /**
     * Find the best cell to try next (MRV - Minimum Remaining Values)
     * @param {SudokuBoard} board - The board to check
     * @returns {Object|null} The best cell with its row, col, and candidates
     * @private
     */
    _findBestCell(board) {
        let bestCell = null;
        let minCandidates = 10; // More than maximum possible (9)
        
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                // Skip filled cells
                if (board.grid[row][col] !== 0) continue;
                
                // Get candidates for this cell
                const candidates = board.getCandidates(row, col);
                
                // If no candidates, this path is impossible
                if (candidates.length === 0) {
                    return null;
                }
                
                // Update best cell if this one has fewer candidates
                if (candidates.length < minCandidates) {
                    minCandidates = candidates.length;
                    bestCell = { row, col, candidates };
                    
                    // If only one candidate, return immediately (can't do better)
                    if (minCandidates === 1) {
                        return bestCell;
                    }
                }
            }
        }
        
        return bestCell;
    }
    
    /**
     * Calculate the difficulty of the current board
     * @returns {number} Difficulty rating (1-5)
     */
    calculateDifficulty() {
        // Solve the board and record steps
        this.solve({ recordSteps: true });
        
        // Count the different techniques used
        const techniques = {
            naked_single: 0,
            hidden_single: 0,
            backtrack_try: 0
        };
        
        for (const step of this.steps) {
            if (step.type in techniques) {
                techniques[step.type]++;
            }
        }
        
        // Calculate difficulty based on techniques used
        let difficulty = 1; // Default: Easy
        
        const backtrackRatio = techniques.backtrack_try / this.steps.length;
        
        if (backtrackRatio > 0.7) {
            difficulty = 5; // Expert
        } else if (backtrackRatio > 0.5) {
            difficulty = 4; // Hard
        } else if (backtrackRatio > 0.3) {
            difficulty = 3; // Medium
        } else if (backtrackRatio > 0.1) {
            difficulty = 2; // Medium-Easy
        }
        
        this.difficulty = difficulty;
        return difficulty;
    }
    
    /**
     * Check if a board has a unique solution
     * @param {SudokuBoard} board - The board to check
     * @returns {boolean} Whether the board has exactly one solution
     */
    hasUniqueSolution(board) {
        const originalBoard = this.board;
        this.setBoard(board);
        
        // Find up to 2 solutions
        const result = this.solve({ findAll: true });
        
        // Restore original board
        this.board = originalBoard;
        
        return result.count === 1;
    }
}

/**
 * DancingLinks implementation for efficient exact cover problems
 * This is the foundation for more advanced solving techniques and puzzle generation
 */
export class DancingLinks {
    constructor() {
        this.header = null; // Header node
        this.solution = []; // Current solution
    }
    
    /**
     * Create the DLX matrix for a Sudoku puzzle
     * @param {SudokuBoard} board - The initial Sudoku board
     */
    createMatrix(board) {
        // DLX matrix construction would go here
        // This is a placeholder for the full implementation
        // The matrix would represent the exact cover constraints:
        // - Each cell must have exactly one value
        // - Each row must have each value exactly once
        // - Each column must have each value exactly once
        // - Each box must have each value exactly once
        
        // For now, we'll use the simpler backtracking with constraint propagation
        throw new Error('DLX implementation is a placeholder for future development');
    }
    
    /**
     * Solve the exact cover problem using Algorithm X with Dancing Links
     * @returns {boolean} Whether a solution was found
     */
    solve() {
        // Algorithm X implementation would go here
        // This is a placeholder for the full implementation
        
        throw new Error('DLX implementation is a placeholder for future development');
    }
}

/**
 * Generate a Sudoku puzzle with a specific difficulty
 * @param {number} difficulty - Difficulty level (1-5)
 * @returns {SudokuBoard} Generated puzzle
 */
export function generatePuzzle(difficulty = 3) {
    // Use the solver to generate a valid, unique puzzle of the desired difficulty
    
    // Step 1: Generate a solved board
    const solver = new SudokuSolver();
    const board = new SudokuBoard();
    
    // Start with some random values
    let attempts = 0;
    let row = Math.floor(Math.random() * 9);
    let col = Math.floor(Math.random() * 9);
    let value = Math.floor(Math.random() * 9) + 1;
    
    board.setValue(row, col, value);
    
    // Solve from this starting point
    const result = solver.solve({ recordSteps: false });
    
    if (!result.solved) {
        // Try again with a different starting point
        return generatePuzzle(difficulty);
    }
    
    const solvedBoard = result.solutions[0];
    
    // Step 2: Remove cells while maintaining uniqueness
    // This is a simplified algorithm - a more sophisticated approach would be used in production
    
    // Create a list of all cells
    const cells = [];
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            cells.push({ row: r, col: c });
        }
    }
    
    // Shuffle the cells
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    
    // Start with the solved board
    const puzzle = solvedBoard.clone();
    
    // Determine how many cells to remove based on difficulty
    let cellsToRemove;
    switch (difficulty) {
        case 1: cellsToRemove = 40; break; // Easy
        case 2: cellsToRemove = 45; break; // Medium-Easy
        case 3: cellsToRemove = 50; break; // Medium
        case 4: cellsToRemove = 55; break; // Hard
        case 5: cellsToRemove = 60; break; // Expert
        default: cellsToRemove = 50; break;
    }
    
    // Remove cells
    let removed = 0;
    for (const cell of cells) {
        if (removed >= cellsToRemove) break;
        
        const { row, col } = cell;
        const value = puzzle.grid[row][col];
        
        // Temporarily remove the cell
        puzzle.clearValue(row, col);
        
        // Check if the puzzle still has a unique solution
        if (solver.hasUniqueSolution(puzzle)) {
            removed++;
        } else {
            // If not, put the value back
            puzzle.setValue(row, col, value, true);
        }
    }
    
    // All cells in the final puzzle should be marked as given
    for (let r = 0; r < 9; r++) {
        for (let c = 0; c < 9; c++) {
            if (puzzle.grid[r][c] !== 0) {
                puzzle.isGiven[r][c] = true;
            }
        }
    }
    
    return puzzle;
}

export default SudokuSolver; 