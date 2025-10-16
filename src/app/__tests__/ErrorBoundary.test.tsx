import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import ErrorBoundary from '../ErrorBoundary';
import { ErrorType, ErrorCode } from '../../types/errors';

describe('ErrorBoundary', () => {
  it('displays system error fallback and calls reset handler', () => {
    const reset = vi.fn();

    function ProblemChild() {
      throw new Error('boom');
    }

    const { container } = render(
      <ErrorBoundary onReset={reset}>
        <ProblemChild />
      </ErrorBoundary>
    );

    expect(screen.getByText('서비스에 문제가 발생했습니다')).toBeInTheDocument();
    const retryButton = screen.getByRole('button', { name: '새로 고침' });
    fireEvent.click(retryButton);
    expect(reset).toHaveBeenCalledTimes(1);
    expect(container.firstChild).toMatchInlineSnapshot(`
      <div
        class="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-white"
      >
        <div
          class="w-full max-w-md rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center"
        >
          <h1
            class="text-2xl font-bold text-red-200"
          >
            서비스에 문제가 발생했습니다
          </h1>
          <p
            class="mt-3 text-sm text-red-100 opacity-80"
          >
            잠시 후 다시 시도해 주세요. 문제가 반복되면 고객센터로 문의해 주세요.
          </p>
          <p
            class="mt-4 rounded-md bg-black/30 px-4 py-3 text-xs text-zinc-300"
          >
            boom
          </p>
          <button
            class="mt-6 w-full rounded-full bg-gradient-to-r from-orange-500 to-pink-600 px-4 py-3 font-semibold text-white hover:opacity-90"
            type="button"
          >
            새로 고침
          </button>
        </div>
      </div>
    `);
  });

  it('renders user error fallback without retry button', () => {
    const validationError = Object.assign(new Error('invalid input'), {
      type: ErrorType.VALIDATION_ERROR,
      code: ErrorCode.VALIDATION_001,
      message: '거리는 최소 0.01km 이상이어야 합니다.',
      retryable: false
    });

    function ThrowValidation() {
      throw validationError;
    }

    render(
      <ErrorBoundary>
        <ThrowValidation />
      </ErrorBoundary>
    );

    expect(screen.getByText('입력 내용을 확인해 주세요')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /다시 시도|새로 고침/ })).toBeNull();
    expect(screen.getByText('거리는 최소 0.01km 이상이어야 합니다.')).toBeInTheDocument();
  });
});
