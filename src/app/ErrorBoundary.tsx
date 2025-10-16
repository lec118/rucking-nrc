import { Component, ReactNode } from 'react';
import { useEffect, useMemo } from 'react';
import { classifyError, ErrorCategory, isAppError } from '../utils/errorClassification';
import { formatErrorMessage } from '../utils/errorHandler';
import { useLogger } from '../hooks/useLogger';

interface ErrorBoundaryProps {
  children: ReactNode;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  error: Error | null;
}

type BoundaryError = Error | (Error & { response?: unknown });

const CATEGORY_COPY: Record<
ErrorCategory,
{
  title: string;
  description: string;
  actionLabel?: string;
  showRetry: boolean;
}
> = {
  user: {
    title: '입력 내용을 확인해 주세요',
    description: '입력 값이 잘못되었거나 권한이 부족합니다. 다시 시도하기 전에 내용을 확인해 주세요.',
    actionLabel: '다시 확인',
    showRetry: false
  },
  network: {
    title: '네트워크 연결이 불안정합니다',
    description: '인터넷 연결을 확인하신 후 재시도 버튼을 눌러 주세요.',
    actionLabel: '다시 시도',
    showRetry: true
  },
  system: {
    title: '서비스에 문제가 발생했습니다',
    description: '잠시 후 다시 시도해 주세요. 문제가 반복되면 고객센터로 문의해 주세요.',
    actionLabel: '새로 고침',
    showRetry: true
  },
  gps: {
    title: 'GPS 정보를 가져오지 못했습니다',
    description: '위치 권한을 허용했는지 확인하고, 야외에서 다시 시도해 주세요.',
    actionLabel: '위치 설정 확인',
    showRetry: true
  },
  unknown: {
    title: '예상치 못한 오류가 발생했습니다',
    description: '새로 고침 후에도 문제가 지속되면 지원팀에 문의해 주세요.',
    actionLabel: '새로 고침',
    showRetry: true
  }
};

function deriveMessage(error: BoundaryError | null): string {
  if (!error) {
    return '알 수 없는 오류가 발생했습니다.';
  }

  if (isAppError(error)) {
    return formatErrorMessage(error);
  }

  if ('response' in error && error.response && typeof error.response === 'object') {
    const data = (error.response as Record<string, unknown>).data;
    if (data && typeof data === 'object' && isAppError(data)) {
      return formatErrorMessage(data);
    }

    if (data && typeof data === 'object' && 'message' in data && typeof data.message === 'string') {
      return data.message;
    }
  }

  return error.message || '알 수 없는 오류가 발생했습니다.';
}

interface ErrorFallbackProps {
  error: BoundaryError;
  onReset: () => void;
}

function ErrorFallback({ error, onReset }: ErrorFallbackProps) {
  const { logError } = useLogger('error-boundary');

  const category = useMemo(() => classifyError(error), [error]);
  const copy = CATEGORY_COPY[category];
  const message = useMemo(() => deriveMessage(error), [error]);

  useEffect(() => {
    logError('Captured error in boundary', {
      category,
      message: error?.message,
      stack: error?.stack
    });
  }, [category, error, logError]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-black px-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-red-500/40 bg-red-500/10 p-8 text-center">
        <h1 className="text-2xl font-bold text-red-200">{copy.title}</h1>
        <p className="mt-3 text-sm text-red-100 opacity-80">{copy.description}</p>
        <p className="mt-4 rounded-md bg-black/30 px-4 py-3 text-xs text-zinc-300">
          {message}
        </p>

        {copy.showRetry && (
          <button
            type="button"
            onClick={onReset}
            className="mt-6 w-full rounded-full bg-gradient-to-r from-orange-500 to-pink-600 px-4 py-3 font-semibold text-white hover:opacity-90"
          >
            {copy.actionLabel || '다시 시도'}
          </button>
        )}
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = {
    error: null
  };

  static getDerivedStateFromError(error: BoundaryError) {
    return { error };
  }

  handleReset = () => {
    this.setState({ error: null });
    if (this.props.onReset) {
      this.props.onReset();
    } else {
      window.location.reload();
    }
  };

  render() {
    const { error } = this.state;
    const { children } = this.props;

    if (error) {
      return <ErrorFallback error={error} onReset={this.handleReset} />;
    }

    return children;
  }
}

export default ErrorBoundary;
