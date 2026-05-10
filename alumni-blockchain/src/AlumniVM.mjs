import vm from 'vm';

export class AlumniVM {
  constructor() {
    // State Tree: contractAddress -> persistent key-value store
    this.stateTree = {};
    // Contract Code: contractAddress -> executable JavaScript code
    this.contracts = {};
  }

  /**
   * Deploys a new smart contract to the ALUMNI network
   */
  deployContract(contractAddress, code, initialState = {}) {
    if (this.contracts[contractAddress]) {
      throw new Error('Contract already deployed at this address');
    }
    
    // In a real network, code validation and gas costs would apply here
    this.contracts[contractAddress] = code;
    this.stateTree[contractAddress] = initialState;
    
    console.log(`📜 Contract successfully deployed at ${contractAddress}`);
  }

  /**
   * Executes a method on a deployed smart contract
   */
  callContract(contractAddress, method, args, senderAddress) {
    if (!this.contracts[contractAddress]) {
      throw new Error(`Contract ${contractAddress} not found`);
    }

    const code = this.contracts[contractAddress];
    // Deep clone state to allow reverting if execution fails
    const currentState = JSON.parse(JSON.stringify(this.stateTree[contractAddress]));

    // Create a secure execution sandbox
    const sandbox = {
      state: currentState,           // Contract's persistent memory
      msg: { sender: senderAddress }, // Context about who called the contract
      args: args,                    // Arguments passed to the function
      result: null                   // Variable to hold the return value
    };

    vm.createContext(sandbox);

    // The execution wrapper
    const executionCode = `
      // Inject contract code
      ${code}
      
      // Execute the requested method
      if (typeof ${method} === 'function') {
        result = ${method}(args, state, msg);
      } else {
        throw new Error("Method '${method}' not found in contract");
      }
    `;

    try {
      // Execute the code in the sandbox with a strict timeout (simulating Gas limit)
      vm.runInContext(executionCode, sandbox, { timeout: 100 });
      
      // If execution succeeds without throwing, persist the new state
      this.stateTree[contractAddress] = sandbox.state;
      return sandbox.result;
    } catch (e) {
      throw new Error(`VM Execution Error: ${e.message}`);
    }
  }

  getState(contractAddress) {
    return this.stateTree[contractAddress] || null;
  }
}
