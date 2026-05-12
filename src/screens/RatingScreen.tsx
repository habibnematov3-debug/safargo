import { useCallback, useEffect, useMemo, useState } from 'react';
import { completeRide, getPendingRatings, submitRating, type PendingRating } from '../lib/api';
import { getTelegramIdentity, hapticSuccess } from '../lib/telegram';
import { toUzbekErrorMessage } from '../lib/errors';
import { useSafargoStore } from '../store/useSafargoStore';
import { Button, Card, EmptyState, LoadingState } from '../components/ui';

type RatingScreenProps = {
  onPendingCountChange?: (count: number) => void;
};

type SelectedRating = PendingRating | null;

const buildInitials = (name: string): string =>
  name
    .split(' ')
    .map((part) => part.trim()[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'HD';

export const RatingScreen = ({ onPendingCountChange }: RatingScreenProps) => {
  const role = useSafargoStore((state) => state.role);
  const identity = useMemo(() => getTelegramIdentity(), []);
  const [pendingRatings, setPendingRatings] = useState<PendingRating[]>([]);
  const [selectedRating, setSelectedRating] = useState<SelectedRating>(null);
  const [stars, setStars] = useState(0);
  const [onTime, setOnTime] = useState(5);
  const [car, setCar] = useState(5);
  const [manners, setManners] = useState(5);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | undefined>();
  const [error, setError] = useState('');

  const loadPendingRatings = useCallback(async () => {
    if (role !== 'passenger') {
      setPendingRatings([]);
      onPendingCountChange?.(0);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const ratings = await getPendingRatings(identity.id);
      setPendingRatings(ratings);
      onPendingCountChange?.(ratings.length);
    } catch (err) {
      console.error('getPendingRatings error:', err);
      setError(toUzbekErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [identity.id, onPendingCountChange, role]);

  useEffect(() => {
    void loadPendingRatings();
  }, [loadPendingRatings]);

  const openRating = (rating: PendingRating) => {
    setSelectedRating(rating);
    setStars(0);
    setOnTime(5);
    setCar(5);
    setManners(5);
    setComment('');
    setError('');
  };

  const closeRating = () => {
    if (isSubmitting) return;
    setSelectedRating(null);
  };

  const submitCurrentRating = async () => {
    if (!selectedRating || stars === 0) return;

    setIsSubmitting(true);
    setError('');

    try {
      await submitRating(
        selectedRating.id,
        selectedRating.driverId,
        identity.id,
        stars,
        onTime,
        car,
        manners,
        comment.trim() || undefined,
      );

      const nextPending = pendingRatings.filter((rating) => rating.id !== selectedRating.id);
      setPendingRatings(nextPending);
      onPendingCountChange?.(nextPending.length);
      setSelectedRating(null);
      hapticSuccess();
    } catch (err) {
      console.error('submitRating error:', err);
      setError(toUzbekErrorMessage(err, "Baholash yuborilmadi. Qayta urinib ko'ring."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="safe-bottom flex flex-1 flex-col gap-4 px-5 py-5">
      <div>
        <h2 className="text-xl font-extrabold">Baholash</h2>
        <p className="text-sm font-bold text-slate-500">Safarlaringizni baholang</p>
      </div>

      {isLoading ? (
        <Card>
          <Spinner />
          <p className="mt-2 text-center text-sm font-bold text-slate-600">Yuklanmoqda...</p>
        </Card>
      ) : error && !selectedRating ? (
        <EmptyState title="Xatolik" text={error} />
      ) : pendingRatings.length === 0 ? (
        <EmptyState title="⭐ Baholanadigan safarlar yo'q" text="Safarlar yakunlangach bu yerda ko'rinadi" />
      ) : (
        <div className="space-y-3">
          {pendingRatings.map((rating) => (
            <Card key={rating.id}>
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary text-sm font-extrabold text-white">
                  {buildInitials(rating.driverName)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-extrabold">{rating.driverName}</p>
                  <p className="mt-1 text-sm font-bold text-slate-600">{rating.tripLabelUz}</p>
                  <p className="mt-1 text-xs font-bold text-slate-500">{rating.completedAtISO}</p>
                </div>
              </div>
              <Button className="mt-4 w-full" onClick={() => openRating(rating)}>
                Baholash →
              </Button>
            </Card>
          ))}
        </div>
      )}

      {selectedRating ? (
        <RatingSheet
          car={car}
          comment={comment}
          driverName={selectedRating.driverName}
          error={error}
          isSubmitting={isSubmitting}
          manners={manners}
          onCarChange={setCar}
          onClose={closeRating}
          onCommentChange={setComment}
          onMannersChange={setManners}
          onOnTimeChange={setOnTime}
          onStarsChange={setStars}
          onSubmit={() => void submitCurrentRating()}
          onTime={onTime}
          stars={stars}
        />
      ) : null}
    </div>
  );
};

const RatingSheet = ({
  car,
  comment,
  driverName,
  error,
  isSubmitting,
  manners,
  onCarChange,
  onClose,
  onCommentChange,
  onMannersChange,
  onOnTimeChange,
  onStarsChange,
  onSubmit,
  onTime,
  stars,
}: {
  car: number;
  comment: string;
  driverName: string;
  error: string;
  isSubmitting: boolean;
  manners: number;
  onCarChange: (value: number) => void;
  onClose: () => void;
  onCommentChange: (value: string) => void;
  onMannersChange: (value: number) => void;
  onOnTimeChange: (value: number) => void;
  onStarsChange: (value: number) => void;
  onSubmit: () => void;
  onTime: number;
  stars: number;
}) => (
  <div className="fixed inset-0 z-40 flex items-end justify-center bg-slate-950/40 px-4 pb-4">
    <div className="w-full max-w-[390px] rounded-t-[28px] bg-white p-5 shadow-2xl">
      <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-xl font-extrabold">Safarni baholang</h3>
          <p className="text-sm font-bold text-slate-500">{driverName}</p>
        </div>
        <button className="rounded-full bg-slate-100 px-3 py-1 text-sm font-extrabold text-slate-600" onClick={onClose}>
          Yopish
        </button>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-sm font-extrabold text-slate-800">Umumiy baho</p>
        <StarSelector onChange={onStarsChange} size="large" value={stars} />
      </div>

      <div className="mt-5 space-y-3">
        <SubRating label="⏱ Vaqtida keldi" onChange={onOnTimeChange} value={onTime} />
        <SubRating label="🚗 Mashina holati" onChange={onCarChange} value={car} />
        <SubRating label="😊 Muomala" onChange={onMannersChange} value={manners} />
      </div>

      <textarea
        className="mt-5 min-h-24 w-full resize-none rounded-2xl border border-slate-200 p-3 text-sm font-bold outline-none focus:border-primary"
        maxLength={200}
        placeholder="Izoh qoldiring... (ixtiyoriy)"
        value={comment}
        onChange={(event) => onCommentChange(event.target.value)}
      />
      <p className="mt-1 text-right text-xs font-bold text-slate-400">{comment.length}/200</p>

      {error ? <p className="mt-2 text-xs font-bold text-red-500">{error}</p> : null}

      <Button className="mt-4 w-full" disabled={stars === 0 || isSubmitting} onClick={onSubmit}>
        {isSubmitting ? 'Yuborilmoqda...' : 'Baholash yuborish →'}
      </Button>
    </div>
  </div>
);

const SubRating = ({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: number) => void;
  value: number;
}) => (
  <div className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-3 py-2">
    <span className="text-sm font-extrabold text-slate-700">{label}</span>
    <StarSelector onChange={onChange} size="small" value={value} />
  </div>
);

const StarSelector = ({
  onChange,
  size,
  value,
}: {
  onChange: (value: number) => void;
  size: 'large' | 'small';
  value: number;
}) => {
  const textSize = size === 'large' ? 'text-[40px] leading-10' : 'text-2xl leading-7';

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          aria-label={`${star} yulduz`}
          className={`${textSize} min-h-10 min-w-8 font-extrabold ${star <= value ? 'text-amber-400' : 'text-slate-300'}`}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
};
