import {
  VscStarFull,
  VscStarEmpty,
  VscCheck,
  VscLoading,
  VscWarning,
  VscClose,
  VscArrowCircleDown,
} from 'react-icons/vsc';

export default function ModelCard({
  model,
  isInstalled,
  isLoaded,
  onLoad,
  onDownload,
  downloadProgress,
  downloadError,
  onRetry,
  onDismiss,
}) {
  // Force these to be booleans with explicit checks
  const hasProgress = downloadProgress && typeof downloadProgress === 'object';
  const isDownloading =
    hasProgress && downloadProgress.progress > 0 && downloadProgress.progress < 100;
  const isComplete =
    hasProgress && (downloadProgress.progress >= 100 || downloadProgress.completed);
  const progress = hasProgress ? downloadProgress.progress || 0 : 0;
  const speed = hasProgress ? downloadProgress.speed || 0 : 0;
  const downloaded = hasProgress ? downloadProgress.downloaded || 0 : 0;
  const total = hasProgress ? downloadProgress.total || 0 : 0;

  //console.log(`ModelCard [${model.name}]:`, {
  //   hasProgress,
  //   isDownloading,
  //   isComplete,
  //   progress,
  //   downloadProgress,
  // });

  const formatBytes = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    if (bytes > 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
    if (bytes > 1e6) return `${(bytes / 1e6).toFixed(1)} MB`;
    if (bytes > 1e3) return `${(bytes / 1e3).toFixed(0)} KB`;
    return `${bytes} B`;
  };

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec === 0) return '';
    if (bytesPerSec > 1e6) return `${(bytesPerSec / 1e6).toFixed(1)} MB/s`;
    if (bytesPerSec > 1e3) return `${(bytesPerSec / 1e3).toFixed(0)} KB/s`;
    return `${bytesPerSec.toFixed(0)} B/s`;
  };

  const getStatusBadge = () => {
    if (isLoaded)
      return { text: 'Loaded', color: 'bg-green-900/20 text-green-400 border-green-800' };
    if (isDownloading)
      return { text: `${progress}%`, color: 'bg-blue-900/20 text-blue-400 border-blue-800' };
    if (isComplete)
      return { text: 'Done', color: 'bg-green-900/20 text-green-400 border-green-800' };
    if (downloadError)
      return { text: 'Failed', color: 'bg-red-900/20 text-red-400 border-red-800' };
    if (isInstalled)
      return { text: 'Installed', color: 'bg-indigo-900/20 text-indigo-400 border-indigo-800' };
    return null;
  };

  const statusBadge = getStatusBadge();

  return (
    <div
      className={`p-4 rounded-lg border transition-colors ${
        isLoaded
          ? 'bg-green-900/10 border-green-800'
          : isDownloading
            ? 'bg-blue-900/10 border-blue-800'
            : isComplete
              ? 'bg-green-900/10 border-green-800'
              : isInstalled
                ? 'bg-indigo-900/10 border-indigo-800'
                : downloadError
                  ? 'bg-red-900/10 border-red-800'
                  : 'bg-gray-800 border-gray-700 hover:border-gray-600'
      }`}
    >
      {/* Header */}
      <div className='flex items-start justify-between mb-2'>
        <div className='min-w-0 flex-1'>
          <h3 className='text-sm font-medium text-gray-200 truncate' title={model.name}>
            {model.name}
          </h3>
        </div>
        <div className='flex items-center gap-0.5 ml-2 flex-shrink-0'>
          {[...Array(5)].map((_, i) =>
            i < (model.stars || 0) ? (
              <VscStarFull key={i} className='w-3 h-3 text-yellow-500' />
            ) : (
              <VscStarEmpty key={i} className='w-3 h-3 text-gray-600' />
            ),
          )}
        </div>
      </div>

      {/* Badges */}
      <div className='flex flex-wrap gap-1.5 mb-2'>
        <span className='text-[10px] px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-400 uppercase'>
          {model.type || 'unknown'}
        </span>
        <span className='text-[10px] px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-400'>
          {model.family || 'Unknown'}
        </span>
        <span className='text-[10px] px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-400'>
          {model.parameters || '?'}
        </span>
        <span className='text-[10px] px-1.5 py-0.5 bg-gray-700/50 rounded text-gray-400'>
          {model.size || '?'}
        </span>
        {statusBadge && (
          <span className={`text-[10px] px-1.5 py-0.5 rounded border ${statusBadge.color}`}>
            {statusBadge.text}
          </span>
        )}
      </div>

      {/* Description */}
      <p className='text-xs text-gray-500 mb-2 line-clamp-2'>{model.description}</p>

      {/* Info Row */}
      <div className='flex items-center gap-3 text-[10px] text-gray-600 mb-3'>
        <span>Context: {(model.contextSize || 0).toLocaleString()}</span>
        <span>{model.quantization || '?'}</span>
      </div>

      {/* DOWNLOAD PROGRESS BAR - Always show if downloading or complete */}
      {(isDownloading || isComplete) && (
        <div className='mb-3'>
          {/* Progress bar */}
          <div className='w-full bg-gray-700 rounded-full h-2.5 overflow-hidden'>
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                isComplete ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${Math.max(progress, 2)}%` }}
            />
          </div>

          {/* Stats */}
          <div className='flex justify-between text-[10px] text-gray-400 mt-1.5'>
            <span className='font-medium text-gray-300'>{progress}%</span>
            {total > 0 && (
              <span>
                {formatBytes(downloaded)} / {formatBytes(total)}
              </span>
            )}
          </div>

          {/* Speed */}
          {speed > 0 && !isComplete && (
            <div className='text-[10px] text-gray-500 mt-0.5'>{formatSpeed(speed)}</div>
          )}

          {/* Complete message */}
          {isComplete && (
            <div className='text-[10px] text-green-400 mt-1 font-medium'>✓ Download complete</div>
          )}
        </div>
      )}

      {/* Error Message */}
      {downloadError && (
        <div className='mb-3 p-2 bg-red-900/20 rounded text-[10px] text-red-400 flex items-start gap-1'>
          <VscWarning className='w-3 h-3 flex-shrink-0 mt-0.5' />
          <span>{downloadError}</span>
        </div>
      )}

      {/* Actions */}
      <div className='flex items-center gap-2'>
        {/* Download button - show if not installed and not downloading */}
        {!isInstalled && !isDownloading && !isComplete && (
          <button
            onClick={() => onDownload(model)}
            className='flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 rounded text-xs text-white font-medium transition-colors'
          >
            <VscArrowCircleDown className='w-3.5 h-3.5' />
            Download
          </button>
        )}

        {/* Downloading - show cancel button */}
        {isDownloading && (
          <button
            onClick={() => onDownload(null)}
            className='flex items-center gap-1.5 px-3 py-1.5 bg-red-900/30 hover:bg-red-900/50 rounded text-xs text-red-400 transition-colors'
          >
            <VscClose className='w-3.5 h-3.5' />
            Cancel
          </button>
        )}

        {/* Complete - show dismiss button */}
        {isComplete && (
          <button
            onClick={() => onDismiss && onDismiss()}
            className='flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors'
          >
            <VscCheck className='w-3.5 h-3.5' />
            Dismiss
          </button>
        )}

        {/* Installed - show load button */}
        {isInstalled && !isDownloading && !isComplete && (
          <button
            onClick={() => onLoad(model)}
            disabled={isLoaded}
            className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
              isLoaded
                ? 'bg-green-900/20 text-green-400 cursor-default'
                : 'bg-indigo-900/20 text-indigo-400 hover:bg-indigo-900/30'
            }`}
          >
            {isLoaded ? (
              <>
                <VscCheck className='w-3.5 h-3.5 inline mr-1' /> Loaded
              </>
            ) : (
              'Load'
            )}
          </button>
        )}

        {/* Error - show retry button */}
        {downloadError && (
          <button
            onClick={() => onRetry && onRetry()}
            className='px-3 py-1.5 bg-gray-700 hover:bg-gray-600 rounded text-xs text-gray-300 transition-colors'
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}
