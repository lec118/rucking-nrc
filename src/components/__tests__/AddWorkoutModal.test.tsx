import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AddWorkoutModal from '../AddWorkoutModal.jsx';
import { createWorkoutPayload } from '../../test/mocks/workouts';

const mockAddWorkout = vi.fn();
const mockOnClose = vi.fn();

vi.mock('../../context/WorkoutContext', () => ({
  useWorkout: () => ({
    addWorkout: mockAddWorkout
  })
}));

describe('AddWorkoutModal', () => {
  beforeEach(() => {
    mockAddWorkout.mockReset();
    mockOnClose.mockReset();
  });

  it('submits valid form data and closes modal', async () => {
    const user = userEvent.setup();
    mockAddWorkout.mockResolvedValue(createWorkoutPayload());

    render(<AddWorkoutModal onClose={mockOnClose} />);

    await user.type(screen.getByLabelText(/Workout Title/i), 'City Ruck');
    await user.type(screen.getByLabelText(/Distance/i), '5.5');
    await user.type(screen.getByLabelText(/Duration/i), '70');
    await user.type(screen.getByLabelText(/Ruck Weight/i), '14');

    await user.click(screen.getByRole('button', { name: /Add Workout/i }));

    await waitFor(() => {
      expect(mockAddWorkout).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    const payload = mockAddWorkout.mock.calls[0][0];
    expect(payload).toMatchObject({
      title: 'City Ruck',
      distance: 5.5,
      duration: 70,
      weight: 14
    });
    expect(payload.pace).toBeCloseTo(12.7, 1);
  });

  it('shows validation errors for invalid input and prevents submission', async () => {
    const user = userEvent.setup();
    mockAddWorkout.mockResolvedValue(createWorkoutPayload());

    render(<AddWorkoutModal onClose={mockOnClose} />);

    fireEvent.submit(screen.getByRole('button', { name: /Add Workout/i }).closest('form') as HTMLFormElement);

    await waitFor(() => {
      expect(screen.getByText(/입력 항목을 다시 확인해 주세요/i)).toBeInTheDocument();
    });

    expect(mockAddWorkout).not.toHaveBeenCalled();
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
