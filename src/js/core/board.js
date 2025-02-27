/**
 * SudoSage - Board Representation Module
 * 
 * This module implements the Sudoku board representation using a hybrid data structure:
 * 1. A 9x9 matrix for direct access and traditional representation 
 * 2. Bit vectors for rows, columns, and boxes for O(1) constraint validation
 * 3. Sparse matrix for candidate tracking
 * 
 * Performance target: O(1) for constraint validation and cell updates
 */

/**
 * Constants for Sudoku board
 */
const BOARD_SIZE = 9;
const BOX_SIZE = 3;
const EMPTY_CELL = 0;

/**
 * Bit manipulation helpers
 */
const FULL_BIT_MASK = 0b111111111; // 9 bits set, represents all numbers 1-9
const getBit = (num, pos) => (num & (1 << (pos - 1))) !== 0;
const setBit = (num, pos) => num | (1 << (pos - 1));
const clearBit = (num, pos) => num & ~(1 << (pos - 1));
const countBits = (num) => {
    let count = 0;
    while (num > 0) {
        count += num & 1;
        num >>= 1;
    }
    return count;
};
const getAllSetBits = (num) => {
    const bits = [];
    for (let i = 1; i <= 9; i++) {
        if (getBit(num, i)) {
            bits.push(i);
        }
    }
    return bits;
};

/**
 * SudokuBoard class - Implements the hybrid board representation
 */
class SudokuBoard {
    constructor(initialBoard = null) {
        // Initialize the main 9x9 grid
        this.grid = Array(BOARD_SIZE).fill().map(() => Array(BOARD_SIZE).fill(EMPTY_CELL));
        
        // Initialize bit vectors for constraint validation
        // Each bit position (1-9) represents whether a number is present in that row/column/box
        this.rowBits = Array(BOARD_SIZE).fill(0);
        this.colBits = Array(BOARD_SIZE).fill(0);
        this.boxBits = Array(BOARD_SIZE).fill(0);
        
        // Initialize the candidate matrix (possibilities)
        // Using bit vectors for normal operation, but will support array format for tests
        this.candidates = Array(BOARD_SIZE).fill().map(() => 
            Array(BOARD_SIZE).fill(FULL_BIT_MASK));
        
        // Track which cells are given/fixed and cannot be changed
        this.isGiven = Array(BOARD_SIZE).fill().map(() => 
            Array(BOARD_SIZE).fill(false));
        
        // If initial board provided, set it up
        if (initialBoard) {
            this.setBoard(initialBoard);
        }
    }
    
    /**
     * Sets the board from a 2D array (9x9)
     * @param {Array<Array<number>>} boardArray - 9x9 array with values 0-9 (0 for empty)
     */
    setBoard(boardArray) {
        // Validate input dimensions
        if (!Array.isArray(boardArray) || boardArray.length !== BOARD_SIZE) {
            throw new Error('Invalid board dimensions');
        }
        
        // Reset all data structures
        this.reset();
        
        // Fill the board
        for (let row = 0; row < BOARD_SIZE; row++) {
            if (!Array.isArray(boardArray[row]) || boardArray[row].length !== BOARD_SIZE) {
                throw new Error(`Invalid row dimensions at row ${row}`);
            }
            
            for (let col = 0; col < BOARD_SIZE; col++) {
                const value = boardArray[row][col];
                
                // Validate the value is in range 0-9
                if (value < 0 || value > 9) {
                    throw new Error(`Invalid value ${value} at position [${row},${col}]`);
                }
                
                // Skip empty cells
                if (value === EMPTY_CELL) continue;
                
                // Set the value and mark as given
                this.setValue(row, col, value, true);
            }
        }
    }
    
    /**
     * Resets the board to empty state
     */
    reset() {
        // Reset the main grid
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                this.grid[row][col] = EMPTY_CELL;
                this.isGiven[row][col] = false;
            }
        }
        
        // Reset bit vectors
        this.rowBits = Array(BOARD_SIZE).fill(0);
        this.colBits = Array(BOARD_SIZE).fill(0);
        this.boxBits = Array(BOARD_SIZE).fill(0);
        
        // Reset candidates
        this.candidates = Array(BOARD_SIZE).fill().map(() => 
            Array(BOARD_SIZE).fill(FULL_BIT_MASK));
    }
    
    /**
     * Gets the box index (0-8) for a given row and column
     * @param {number} row - Row index (0-8)
     * @param {number} col - Column index (0-8)
     * @returns {number} Box index (0-8)
     */
    getBoxIndex(row, col) {
        return Math.floor(row / BOX_SIZE) * BOX_SIZE + Math.floor(col / BOX_SIZE);
    }
    
    /**
     * Sets a value in the board and updates all representations
     * @param {number} row - Row index (0-8)
     * @param {number} col - Column index (0-8)
     * @param {number} value - Value to set (1-9, or 0 for empty)
     * @param {boolean} isGiven - Whether this is a fixed/given value
     * @returns {boolean} Whether the operation was successful
     */
    setValue(row, col, value, isGiven = false) {
        // Validate indices
        if (row < 0 || row >= BOARD_SIZE || col < 0 || col >= BOARD_SIZE) {
            throw new Error(`Invalid position [${row},${col}]`);
        }
        
        // Validate value
        if (value < 0 || value > 9) {
            throw new Error(`Invalid value ${value}`);
        }
        
        // Cannot modify given cells
        if (this.isGiven[row][col] && !isGiven) {
            return false;
        }
        
        // First clear the old value if not empty
        const oldValue = this.grid[row][col];
        if (oldValue !== EMPTY_CELL) {
            this.clearValue(row, col);
        }
        
        // If setting to empty, we're done
        if (value === EMPTY_CELL) {
            this.updateCandidates(row, col);
            return true;
        }
        
        // Get box index
        const boxIndex = this.getBoxIndex(row, col);
        
        // Check if the move is valid (not already present in row, col, box)
        if (getBit(this.rowBits[row], value) || 
            getBit(this.colBits[col], value) || 
            getBit(this.boxBits[boxIndex], value)) {
            return false; // Value would create a conflict
        }
        
        // Set the value in the main grid
        this.grid[row][col] = value;
        this.isGiven[row][col] = isGiven;
        
        // Update bit vectors
        this.rowBits[row] = setBit(this.rowBits[row], value);
        this.colBits[col] = setBit(this.colBits[col], value);
        this.boxBits[boxIndex] = setBit(this.boxBits[boxIndex], value);
        
        // Clear candidates for this cell
        if (Array.isArray(this.candidates[row][col])) {
            this.candidates[row][col] = [];
        } else {
            this.candidates[row][col] = 0;
        }
        
        // Update candidates for affected cells
        this.updateCandidatesForRegion(row, col, value);
        
        return true;
    }
    
    /**
     * Clears a value from the board
     * @param {number} row - Row index (0-8)
     * @param {number} col - Column index (0-8)
     * @returns {boolean} Whether the operation was successful
     */
    clearValue(row, col) {
        // Cannot clear given cells
        if (this.isGiven[row][col]) {
            return false;
        }
        
        const value = this.grid[row][col];
        
        // If already empty, nothing to do
        if (value === EMPTY_CELL) {
            return true;
        }
        
        const boxIndex = this.getBoxIndex(row, col);
        
        // Clear the value in the main grid
        this.grid[row][col] = EMPTY_CELL;
        
        // Update bit vectors
        this.rowBits[row] = clearBit(this.rowBits[row], value);
        this.colBits[col] = clearBit(this.colBits[col], value);
        this.boxBits[boxIndex] = clearBit(this.boxBits[boxIndex], value);
        
        // Restore candidates for this cell
        this.updateCandidates(row, col);
        
        // Update candidates for affected cells
        this.updateCandidatesForRegion(row, col, value);
        
        return true;
    }
    
    /**
     * Updates candidates for a specific cell
     * @param {number} row - Row index (0-8)
     * @param {number} col - Column index (0-8)
     */
    updateCandidates(row, col) {
        // Skip if cell is not empty
        if (this.grid[row][col] !== EMPTY_CELL) {
            if (Array.isArray(this.candidates[row][col])) {
                this.candidates[row][col] = [];
            } else {
                this.candidates[row][col] = 0;
            }
            return;
        }
        
        const boxIndex = this.getBoxIndex(row, col);
        
        // Handle array-based candidates (for tests)
        if (Array.isArray(this.candidates[row][col])) {
            this.candidates[row][col] = [];
            for (let num = 1; num <= 9; num++) {
                if (!getBit(this.rowBits[row], num) && 
                    !getBit(this.colBits[col], num) && 
                    !getBit(this.boxBits[boxIndex], num)) {
                    this.candidates[row][col].push(num);
                }
            }
            return;
        }
        
        // Handle bit vector candidates (normal operation)
        // Start with all candidates
        let newCandidates = FULL_BIT_MASK;
        
        // Remove candidates that exist in the same row, column, or box
        for (let num = 1; num <= 9; num++) {
            if (getBit(this.rowBits[row], num) || 
                getBit(this.colBits[col], num) || 
                getBit(this.boxBits[boxIndex], num)) {
                newCandidates = clearBit(newCandidates, num);
            }
        }
        
        // Set the new candidates
        this.candidates[row][col] = newCandidates;
    }
    
    /**
     * Updates candidates for all cells affected by a change at [row,col]
     * @param {number} row - Row index (0-8)
     * @param {number} col - Column index (0-8)
     * @param {number} value - The value that was added or removed
     */
    updateCandidatesForRegion(row, col, value) {
        const boxIndex = this.getBoxIndex(row, col);
        
        // Update candidates for all cells in the same row
        for (let c = 0; c < BOARD_SIZE; c++) {
            if (c !== col && this.grid[row][c] === EMPTY_CELL) {
                this.updateCandidates(row, c);
            }
        }
        
        // Update candidates for all cells in the same column
        for (let r = 0; r < BOARD_SIZE; r++) {
            if (r !== row && this.grid[r][col] === EMPTY_CELL) {
                this.updateCandidates(r, col);
            }
        }
        
        // Update candidates for all cells in the same box
        const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
        const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
        
        for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
            for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
                if ((r !== row || c !== col) && this.grid[r][c] === EMPTY_CELL) {
                    this.updateCandidates(r, c);
                }
            }
        }
    }
    
    /**
     * Updates candidates for all cells in the board
     * Useful for ensuring candidate lists are consistent with the board state
     */
    updateAllCandidates() {
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                this.updateCandidates(row, col);
            }
        }
    }
    
    /**
     * Checks if the board is valid (no conflicts)
     * @returns {boolean} Whether the board is valid
     */
    isValid() {
        // Check each row, column, and box for duplicates
        for (let i = 0; i < BOARD_SIZE; i++) {
            // Count set bits in each row, column, and box
            const rowBits = countBits(this.rowBits[i]);
            const colBits = countBits(this.colBits[i]);
            const boxBits = countBits(this.boxBits[i]);
            
            // Count non-empty cells in each row, column, and box
            let rowCount = 0, colCount = 0, boxCount = 0;
            for (let j = 0; j < BOARD_SIZE; j++) {
                if (this.grid[i][j] !== EMPTY_CELL) rowCount++;
                if (this.grid[j][i] !== EMPTY_CELL) colCount++;
                
                const boxRow = Math.floor(i / BOX_SIZE) * BOX_SIZE + Math.floor(j / BOX_SIZE);
                const boxCol = (i % BOX_SIZE) * BOX_SIZE + (j % BOX_SIZE);
                if (this.grid[boxRow][boxCol] !== EMPTY_CELL) boxCount++;
            }
            
            // If counts don't match, there are duplicates
            if (rowBits !== rowCount || colBits !== colCount || boxBits !== boxCount) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Checks if the board is complete (valid and filled)
     * @returns {boolean} Whether the board is complete
     */
    isComplete() {
        // First check if valid
        if (!this.isValid()) {
            return false;
        }
        
        // Check if all cells are filled
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (this.grid[row][col] === EMPTY_CELL) {
                    return false;
                }
            }
        }
        
        return true;
    }
    
    /**
     * Gets all candidates for a specific cell
     * @param {number} row - Row index (0-8)
     * @param {number} col - Column index (0-8)
     * @returns {Array<number>} Array of candidate values (1-9)
     */
    getCandidates(row, col) {
        // Validate position
        if (row < 0 || row > 8 || col < 0 || col > 8) {
            console.error('Invalid position:', row, col);
            return [];
        }
        
        // Handle array-based candidates (for test compatibility)
        if (Array.isArray(this.candidates[row][col])) {
            return [...this.candidates[row][col]];
        }
        
        // Handle bit vector candidates
        const bitMask = this.candidates[row][col];
        return getAllSetBits(bitMask);
    }
    
    /**
     * Gets the board as a 2D array
     * @returns {Array<Array<number>>} 9x9 array with values 0-9 (0 for empty)
     */
    getBoard() {
        return this.grid.map(row => [...row]);
    }
    
    /**
     * Returns a deep copy of the board instance
     * @returns {SudokuBoard} A new board instance with the same state
     */
    clone() {
        const newBoard = new SudokuBoard();
        
        // Copy grid and isGiven
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                newBoard.grid[row][col] = this.grid[row][col];
                newBoard.isGiven[row][col] = this.isGiven[row][col];
            }
        }
        
        // Copy bit vectors
        newBoard.rowBits = [...this.rowBits];
        newBoard.colBits = [...this.colBits];
        newBoard.boxBits = [...this.boxBits];
        
        // Copy candidates
        for (let row = 0; row < BOARD_SIZE; row++) {
            for (let col = 0; col < BOARD_SIZE; col++) {
                if (Array.isArray(this.candidates[row][col])) {
                    newBoard.candidates[row][col] = [...this.candidates[row][col]];
                } else {
                    newBoard.candidates[row][col] = this.candidates[row][col];
                }
            }
        }
        
        return newBoard;
    }
    
    /**
     * Adds a candidate value to a cell
     * @param {number} row - Row index (0-8)
     * @param {number} col - Column index (0-8)
     * @param {number} value - Candidate value (1-9)
     * @returns {boolean} Whether the operation was successful
     */
    addCandidate(row, col, value) {
        // Validate position
        if (row < 0 || row > 8 || col < 0 || col > 8) {
            console.error('Invalid position:', row, col);
            return false;
        }
        
        // Validate value
        if (value < 1 || value > 9) {
            console.error('Invalid candidate value:', value);
            return false;
        }
        
        // Cannot add candidates to filled cells
        if (this.grid[row][col] !== 0) {
            return false;
        }
        
        // Handle array-based candidates (for tests)
        if (Array.isArray(this.candidates[row][col])) {
            if (!this.candidates[row][col].includes(value)) {
                this.candidates[row][col].push(value);
                this.candidates[row][col].sort((a, b) => a - b);
            }
            return true;
        }
        
        // Handle bit vector candidates
        this.candidates[row][col] = setBit(this.candidates[row][col], value);
        
        return true;
    }
    
    /**
     * Removes a candidate value from a cell
     * @param {number} row - Row index (0-8)
     * @param {number} col - Column index (0-8)
     * @param {number} value - Candidate value (1-9)
     * @returns {boolean} Whether the operation was successful
     */
    removeCandidate(row, col, value) {
        // Validate position
        if (row < 0 || row > 8 || col < 0 || col > 8) {
            console.error('Invalid position:', row, col);
            return false;
        }
        
        // Validate value
        if (value < 1 || value > 9) {
            console.error('Invalid candidate value:', value);
            return false;
        }
        
        // Cannot remove candidates from filled cells
        if (this.grid[row][col] !== 0) {
            return false;
        }
        
        // Handle array-based candidates (for tests)
        if (Array.isArray(this.candidates[row][col])) {
            const index = this.candidates[row][col].indexOf(value);
            if (index !== -1) {
                this.candidates[row][col].splice(index, 1);
                return true;
            }
            return false;
        }
        
        // Handle bit vector candidates
        this.candidates[row][col] = clearBit(this.candidates[row][col], value);
        
        return true;
    }
    
    /**
     * Serializes the board to a JSON-compatible object
     * @returns {Object} Serialized board data
     */
    serialize() {
        return {
            grid: JSON.parse(JSON.stringify(this.grid)),
            isGiven: JSON.parse(JSON.stringify(this.isGiven)),
            rowBits: [...this.rowBits],
            colBits: [...this.colBits],
            boxBits: [...this.boxBits],
            candidates: this.candidates.map(row => [...row])
        };
    }
    
    /**
     * Creates a new SudokuBoard from serialized data
     * @param {Object} data - Serialized board data
     * @returns {SudokuBoard} A new SudokuBoard instance
     */
    static deserialize(data) {
        const board = new SudokuBoard();
        
        // Restore grid and isGiven
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                board.grid[row][col] = data.grid[row][col];
                board.isGiven[row][col] = data.isGiven[row][col];
            }
        }
        
        // Restore bit vectors
        board.rowBits = [...data.rowBits];
        board.colBits = [...data.colBits];
        board.boxBits = [...data.boxBits];
        
        // Restore candidates
        for (let row = 0; row < 9; row++) {
            for (let col = 0; col < 9; col++) {
                board.candidates[row][col] = data.candidates[row][col];
            }
        }
        
        return board;
    }
}

// Export the SudokuBoard class
export default SudokuBoard; 