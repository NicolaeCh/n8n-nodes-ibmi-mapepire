function state() {
  if (!global.__MAPEPIRE_FAKE__) {
    global.__MAPEPIRE_FAKE__ = { pools: [], plans: [] };
  }
  return global.__MAPEPIRE_FAKE__;
}

class Pool {
  constructor(options) {
    this.options = options;
    this.plan = state().plans.shift() || {};
    this.ended = false;
    state().pools.push(this);
  }

  async init() {
    if (this.plan.initError) throw this.plan.initError;
    this.initialized = true;
  }

  query(sql, opts) {
    this.lastQuery = { sql, opts };
    const plan = this.plan.query || {};
    let fetchIndex = 0;
    return {
      execute: async (rows) => {
        this.queryExecuteCalls = (this.queryExecuteCalls || 0) + 1;
        this.firstFetchSize = rows;
        if (plan.executeError) throw plan.executeError;
        return plan.firstPage;
      },
      fetchMore: async (rows) => {
        this.queryFetchCalls = (this.queryFetchCalls || 0) + 1;
        this.fetchSizes = [...(this.fetchSizes || []), rows];
        const page = (plan.morePages || [])[fetchIndex++];
        if (page instanceof Error) throw page;
        if (!page) throw new Error('No scripted fetchMore page');
        return page;
      },
      close: async () => {
        this.queryCloseCalls = (this.queryCloseCalls || 0) + 1;
        if (plan.closeError) throw plan.closeError;
      },
    };
  }

  async execute(sql, opts) {
    this.writeCalls = (this.writeCalls || 0) + 1;
    this.lastExecute = { sql, opts };
    if (this.plan.executeError) throw this.plan.executeError;
    return this.plan.executeResult;
  }

  end() {
    this.ended = true;
    this.endCalls = (this.endCalls || 0) + 1;
  }
}

module.exports = { Pool };
