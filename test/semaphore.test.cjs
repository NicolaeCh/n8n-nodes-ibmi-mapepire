const test = require('node:test');
const assert = require('node:assert/strict');
const { Semaphore } = require('../.test-dist/semaphore.js');

test('semaphore queues and releases slots', async () => {
  const semaphore = new Semaphore(1);
  const release1 = await semaphore.acquire(1000);
  const pending = semaphore.acquire(1000);
  assert.equal(semaphore.getActiveCount(), 1);
  assert.equal(semaphore.getWaitingCount(), 1);
  release1();
  const release2 = await pending;
  assert.equal(semaphore.getActiveCount(), 1);
  release2();
  assert.equal(semaphore.getActiveCount(), 0);
});

test('semaphore times out waiting callers', async () => {
  const semaphore = new Semaphore(1);
  const release = await semaphore.acquire(1000);
  await assert.rejects(semaphore.acquire(10), /No Mapepire pool slot/);
  release();
});
