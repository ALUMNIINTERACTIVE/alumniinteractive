// ==============================================================================
// ALC-20 AND AMM DEX SMART CONTRACT
// Pattern: Single-Program Architecture (Similar to Solana SPL Token Program)
// ==============================================================================

/**
 * Creates a new ALC-20 Token and mints the initial supply to the creator
 */
function createToken(args, state, msg) {
  const symbol = args.symbol;
  const supply = args.supply;

  if (!state.tokens) state.tokens = {};
  if (!state.balances) state.balances = {};
  
  if (state.tokens[symbol]) {
    throw new Error(`Token ${symbol} already exists.`);
  }

  // Register token
  state.tokens[symbol] = {
    creator: msg.sender,
    totalSupply: supply
  };

  // Mint initial supply to creator
  if (!state.balances[symbol]) state.balances[symbol] = {};
  state.balances[symbol][msg.sender] = supply;

  return `Successfully created ${supply} ${symbol} tokens.`;
}

/**
 * Transfers ALC-20 tokens between addresses
 */
function transfer(args, state, msg) {
  const symbol = args.symbol;
  const to = args.to;
  const amount = args.amount;

  if (!state.tokens[symbol]) throw new Error('Token does not exist.');
  if (!state.balances[symbol][msg.sender] || state.balances[symbol][msg.sender] < amount) {
    throw new Error(`Insufficient ${symbol} balance.`);
  }

  // Deduct from sender
  state.balances[symbol][msg.sender] -= amount;
  
  // Add to recipient
  if (!state.balances[symbol][to]) state.balances[symbol][to] = 0;
  state.balances[symbol][to] += amount;

  return `Transferred ${amount} ${symbol} to ${to.substring(0, 16)}...`;
}

/**
 * AMM: Create a Liquidity Pool for Token A and Token B
 */
function createPool(args, state, msg) {
  const { symbolA, symbolB, amountA, amountB } = args;
  
  if (!state.pools) state.pools = {};
  const poolId = [symbolA, symbolB].sort().join('-');

  if (state.pools[poolId]) throw new Error('Liquidity pool already exists.');

  // Transfer tokens from creator to the 'POOL' address
  transfer({ symbol: symbolA, to: poolId, amount: amountA }, state, msg);
  transfer({ symbol: symbolB, to: poolId, amount: amountB }, state, msg);

  const isAtoB = symbolA < symbolB;
  const reserveA = isAtoB ? amountA : amountB;
  const reserveB = isAtoB ? amountB : amountA;

  // Initialize Constant Product AMM (x * y = k)
  state.pools[poolId] = {
    reserveA: reserveA,
    reserveB: reserveB,
    k: reserveA * reserveB
  };

  return `Created Liquidity Pool for ${symbolA}/${symbolB}.`;
}

/**
 * AMM: Swap Token A for Token B using Constant Product Formula
 */
function swap(args, state, msg) {
  const { symbolIn, symbolOut, amountIn } = args;
  const poolId = [symbolIn, symbolOut].sort().join('-');

  if (!state.pools || !state.pools[poolId]) throw new Error('Pool does not exist.');

  const pool = state.pools[poolId];
  
  // Determine direction
  const isAtoB = symbolIn < symbolOut;
  const reserveIn = isAtoB ? pool.reserveA : pool.reserveB;
  const reserveOut = isAtoB ? pool.reserveB : pool.reserveA;

  // Constant Product Formula: (x + dx) * (y - dy) = k
  // dy = y - (k / (x + dx))
  const newReserveIn = reserveIn + amountIn;
  const newReserveOut = pool.k / newReserveIn;
  const amountOut = reserveOut - newReserveOut;

  if (amountOut <= 0) throw new Error('Insufficient output amount.');

  // Execute transfers
  // 1. User sends symbolIn to Pool
  transfer({ symbol: symbolIn, to: poolId, amount: amountIn }, state, msg);
  
  // 2. Pool sends symbolOut to User (We forge the sender as the pool)
  const poolMsg = { sender: poolId };
  transfer({ symbol: symbolOut, to: msg.sender, amount: amountOut }, state, poolMsg);

  // Update reserves
  if (isAtoB) {
    pool.reserveA = newReserveIn;
    pool.reserveB = newReserveOut;
  } else {
    pool.reserveB = newReserveIn;
    pool.reserveA = newReserveOut;
  }

  return `Swapped ${amountIn} ${symbolIn} for ${amountOut.toFixed(4)} ${symbolOut}.`;
}
