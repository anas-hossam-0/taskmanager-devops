const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Task = require('../src/models/task');

// Connect to a test database before all tests
beforeAll(async () => {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/taskmanager-test';
  await mongoose.connect(MONGO_URI);
});

// Clean up between tests
beforeEach(async () => {
  await Task.deleteMany({});
});

// Disconnect after all tests
afterAll(async () => {
  await Task.deleteMany({});
  await mongoose.connection.close();
});

// ==================== TESTS ====================

describe('Health Check', () => {
  it('GET /health → should return status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });
});

describe('Task API', () => {
  it('GET /api/tasks → should return empty array', async () => {
    const res = await request(app).get('/api/tasks');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual([]);
    expect(res.body.count).toBe(0);
  });

  it('POST /api/tasks → should create a task', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({ title: 'Test Task' });

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.title).toBe('Test Task');
    expect(res.body.data.completed).toBe(false);
  });

  it('POST /api/tasks → should fail without title', async () => {
    const res = await request(app)
      .post('/api/tasks')
      .send({});

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('GET /api/tasks/:id → should return a single task', async () => {
    const task = await Task.create({ title: 'Find me' });

    const res = await request(app).get(`/api/tasks/${task._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('Find me');
  });

  it('PUT /api/tasks/:id → should update a task', async () => {
    const task = await Task.create({ title: 'Old title' });

    const res = await request(app)
      .put(`/api/tasks/${task._id}`)
      .send({ title: 'New title', completed: true });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.title).toBe('New title');
    expect(res.body.data.completed).toBe(true);
  });

  it('DELETE /api/tasks/:id → should delete a task', async () => {
    const task = await Task.create({ title: 'Delete me' });

    const res = await request(app).delete(`/api/tasks/${task._id}`);
    expect(res.statusCode).toBe(200);

    const check = await Task.findById(task._id);
    expect(check).toBeNull();
  });

  it('GET /api/tasks/:id → should return 404 for non-existent task', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app).get(`/api/tasks/${fakeId}`);
    expect(res.statusCode).toBe(404);
  });
});