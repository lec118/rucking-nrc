import { workoutAPI } from '../api';

describe('workoutAPI', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.resetAllMocks();
    global.fetch = originalFetch;
  });

  it('includes bearer token and parses JSON on success', async () => {
    const mockResponse = { ok: true, status: 200, text: () => Promise.resolve(JSON.stringify([{ id: 1 }])) } as Response;
    (global.fetch as unknown as vi.Mock).mockResolvedValue(mockResponse);

    const result = await workoutAPI.getWorkouts('test-token');

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/api/workouts'),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer test-token' }),
        credentials: 'include'
      })
    );
    expect(result).toEqual([{ id: 1 }]);
  });

  it('throws formatted error on failure', async () => {
    const errorResponse = {
      ok: false,
      status: 500,
      text: () => Promise.resolve(JSON.stringify({ message: 'Server exploded' }))
    } as Response;
    (global.fetch as unknown as vi.Mock).mockResolvedValue(errorResponse);

    await expect(workoutAPI.getWorkouts('token')).rejects.toThrow('Request failed');
  });
});
