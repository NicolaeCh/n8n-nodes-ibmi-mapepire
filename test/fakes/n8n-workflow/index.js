class NodeOperationError extends Error {
  constructor(node, error, options = {}) {
    super(error instanceof Error ? error.message : String(error));
    this.name = 'NodeOperationError';
    this.node = node;
    this.options = options;
    this.cause = error instanceof Error ? error : undefined;
  }
}

const NodeConnectionTypes = Object.freeze({ Main: 'main' });

module.exports = { NodeConnectionTypes, NodeOperationError };
