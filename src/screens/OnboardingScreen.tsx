import { useCallback, useState } from 'react';
import { getTelegramIdentity, hapticSuccess, hapticTap } from '../lib/telegram';
import { saveDriverProfile, updateUserOnboarding } from '../lib/api';
import { toUzbekErrorMessage } from '../lib/errors';
import { Button, Card } from '../components/ui';
import type { UserRole } from '../types/safargo';

type Gender = 'male' | 'female';

type OnboardingProps = {
  role: UserRole;
  onComplete: () => void;
};

const CAR_MODELS = [
  'Cobalt',
  'Nexia 3',
  'Gentra',
  'Lacetti',
  'Onix',
  'Monza',
  'Spark',
  'Matiz',
  'Damas',
  'Boshqa',
];

const PHONE_REGEX = /^\+998\d{9}$/;

const formatPhoneInput = (raw: string): string => {
  const digits = raw.replace(/[^\d+]/g, '');
  if (!digits.startsWith('+')) {
    return '+998' + digits.replace(/^0+/, '');
  }
  return digits;
};

const validatePhone = (phone: string): boolean => PHONE_REGEX.test(phone.replace(/\s/g, ''));

/* ─── Step Indicator ─── */
const StepIndicator = ({ current, total }: { current: number; total: number }) => (
  <div className="flex flex-col items-center gap-2">
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className={`inline-block h-2.5 w-2.5 rounded-full transition-all duration-300 ${
            i <= current ? 'bg-primary scale-110' : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
    <div className="h-1 w-32 overflow-hidden rounded-full bg-slate-100">
      <div
        className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
        style={{ width: `${((current + 1) / total) * 100}%` }}
      />
    </div>
  </div>
);

/* ─── Welcome Step ─── */
const WelcomeStep = ({ onNext }: { onNext: () => void }) => (
  <div
    className="flex min-h-[calc(100dvh-1px)] flex-col items-center justify-center px-6 text-center text-white"
    style={{ background: 'linear-gradient(160deg, #1A4FD8 0%, #1239A3 100%)' }}
  >
    <div className="onboarding-fade-up">
      <span className="text-7xl">🚗</span>
    </div>

    <h1 className="onboarding-fade-up-delay-1 mt-6 text-3xl font-extrabold leading-tight">
      Safargoga xush kelibsiz!
    </h1>

    <p className="onboarding-fade-up-delay-1 mx-auto mt-3 max-w-[280px] text-base font-bold leading-relaxed text-white/80">
      O'zbekistonda qulay va xavfsiz shaharlararo safar
    </p>

    <div className="onboarding-fade-up-delay-2 mx-auto mt-8 w-full max-w-[300px] space-y-3 text-left">
      {[
        { icon: '✅', text: 'Tasdiqlangan haydovchilar' },
        { icon: '⭐', text: 'Reyting va baholar tizimi' },
        { icon: '🔒', text: 'Xavfsiz bog\u2018lanish' },
      ].map((item) => (
        <div key={item.text} className="flex items-center gap-3 rounded-2xl bg-white/10 px-4 py-3 backdrop-blur">
          <span className="text-lg">{item.icon}</span>
          <span className="text-sm font-bold">{item.text}</span>
        </div>
      ))}
    </div>

    <button
      className="onboarding-fade-up-delay-3 mx-auto mt-10 w-full max-w-[300px] rounded-2xl bg-white px-6 py-4 text-base font-extrabold text-primary shadow-lg transition active:scale-[0.97]"
      onClick={() => {
        hapticTap();
        onNext();
      }}
    >
      Boshlash →
    </button>
  </div>
);

/* ─── Passenger Setup Step ─── */
const PassengerSetupStep = ({
  name,
  phone,
  gender,
  phoneError,
  onNameChange,
  onPhoneChange,
  onGenderChange,
  onNext,
  onBack,
}: {
  name: string;
  phone: string;
  gender: Gender | undefined;
  phoneError: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onGenderChange: (v: Gender | undefined) => void;
  onNext: () => void;
  onBack: () => void;
}) => (
  <div className="safe-bottom flex min-h-[calc(100dvh-1px)] flex-col px-5 py-6">
    <button
      className="mb-4 w-fit text-sm font-extrabold text-primary transition active:scale-[0.97]"
      onClick={() => {
        hapticTap();
        onBack();
      }}
    >
      ← Orqaga
    </button>

    <StepIndicator current={1} total={3} />

    <h2 className="mt-6 text-2xl font-extrabold text-slate-900">Yo'lovchi sifatida kirish</h2>

    <div className="mt-6 flex-1 space-y-4">
      {/* Name */}
      <div>
        <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">Ism</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ismingiz"
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">Telefon</label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(formatPhoneInput(e.target.value))}
          placeholder="+998 XX XXX XX XX"
          className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:ring-2 ${
            phoneError
              ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-primary focus:ring-primary/20'
          }`}
        />
        {phoneError ? (
          <p className="mt-1.5 text-xs font-bold text-red-500">{phoneError}</p>
        ) : (
          <p className="mt-1.5 text-xs font-bold text-slate-400">📞 Haydovchi siz bilan bog'lanishi uchun</p>
        )}
      </div>

      {/* Gender */}
      <div>
        <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
          Jinsi <span className="normal-case text-slate-400">(ixtiyoriy)</span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {([
            { value: 'male' as const, icon: '👨', label: 'Erkak' },
            { value: 'female' as const, icon: '👩', label: 'Ayol' },
          ]).map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`rounded-2xl border px-4 py-3 text-sm font-extrabold transition active:scale-[0.97] ${
                gender === opt.value
                  ? 'border-primary bg-blue-50 text-primary'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
              onClick={() => {
                hapticTap();
                onGenderChange(gender === opt.value ? undefined : opt.value);
              }}
            >
              {opt.icon} {opt.label}
            </button>
          ))}
        </div>
        <p className="mt-1.5 text-xs font-bold text-slate-400">Ayollar uchun maxsus safarlarni ko'rish uchun</p>
      </div>
    </div>

    <Button className="mt-6 w-full" onClick={onNext}>
      Davom etish →
    </Button>
  </div>
);

/* ─── Driver Setup Step ─── */
const DriverSetupStep = ({
  name,
  phone,
  carModel,
  carYear,
  carPlate,
  phoneError,
  carYearError,
  carPlateError,
  onNameChange,
  onPhoneChange,
  onCarModelChange,
  onCarYearChange,
  onCarPlateChange,
  onNext,
  onBack,
}: {
  name: string;
  phone: string;
  carModel: string;
  carYear: string;
  carPlate: string;
  phoneError: string;
  carYearError: string;
  carPlateError: string;
  onNameChange: (v: string) => void;
  onPhoneChange: (v: string) => void;
  onCarModelChange: (v: string) => void;
  onCarYearChange: (v: string) => void;
  onCarPlateChange: (v: string) => void;
  onNext: () => void;
  onBack: () => void;
}) => (
  <div className="safe-bottom flex min-h-[calc(100dvh-1px)] flex-col px-5 py-6">
    <button
      className="mb-4 w-fit text-sm font-extrabold text-primary transition active:scale-[0.97]"
      onClick={() => {
        hapticTap();
        onBack();
      }}
    >
      ← Orqaga
    </button>

    <StepIndicator current={1} total={3} />

    <h2 className="mt-6 text-2xl font-extrabold text-slate-900">Haydovchi sifatida kirish</h2>

    <div className="mt-6 flex-1 space-y-4">
      {/* Name */}
      <div>
        <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">Ism</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Ismingiz"
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        />
      </div>

      {/* Phone */}
      <div>
        <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
          Telefon <span className="text-red-400">*</span>
        </label>
        <input
          type="tel"
          value={phone}
          onChange={(e) => onPhoneChange(formatPhoneInput(e.target.value))}
          placeholder="+998 XX XXX XX XX"
          className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:ring-2 ${
            phoneError
              ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-primary focus:ring-primary/20'
          }`}
        />
        {phoneError ? <p className="mt-1.5 text-xs font-bold text-red-500">{phoneError}</p> : null}
      </div>

      {/* Car Model */}
      <div>
        <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
          Mashina modeli <span className="text-red-400">*</span>
        </label>
        <select
          value={carModel}
          onChange={(e) => onCarModelChange(e.target.value)}
          className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        >
          <option value="">Tanlang</option>
          {CAR_MODELS.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
      </div>

      {/* Car Year */}
      <div>
        <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
          Mashina yili <span className="text-red-400">*</span>
        </label>
        <input
          type="number"
          min={2000}
          max={2025}
          value={carYear}
          onChange={(e) => onCarYearChange(e.target.value)}
          placeholder="2020"
          className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm font-bold text-slate-800 outline-none transition focus:ring-2 ${
            carYearError
              ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-primary focus:ring-primary/20'
          }`}
        />
        {carYearError ? <p className="mt-1.5 text-xs font-bold text-red-500">{carYearError}</p> : null}
      </div>

      {/* Car Plate */}
      <div>
        <label className="mb-2 block text-xs font-extrabold uppercase tracking-wide text-slate-500">
          Mashina raqami <span className="text-red-400">*</span>
        </label>
        <input
          type="text"
          value={carPlate}
          onChange={(e) => onCarPlateChange(e.target.value.toUpperCase())}
          placeholder="01 A 123 AA"
          className={`h-12 w-full rounded-2xl border bg-white px-4 text-sm font-bold uppercase text-slate-800 outline-none transition focus:ring-2 ${
            carPlateError
              ? 'border-red-400 focus:border-red-400 focus:ring-red-100'
              : 'border-slate-200 focus:border-primary focus:ring-primary/20'
          }`}
        />
        {carPlateError ? <p className="mt-1.5 text-xs font-bold text-red-500">{carPlateError}</p> : null}
      </div>
    </div>

    <Button className="mt-6 w-full" onClick={onNext}>
      Davom etish →
    </Button>
  </div>
);

/* ─── Rules Step ─── */
const RulesStep = ({
  role,
  agreed,
  isSaving,
  error,
  onAgreeChange,
  onComplete,
  onBack,
}: {
  role: UserRole;
  agreed: boolean;
  isSaving: boolean;
  error: string;
  onAgreeChange: (v: boolean) => void;
  onComplete: () => void;
  onBack: () => void;
}) => {
  const passengerRules = [
    { icon: '✅', text: 'Haydovchini tanlash huquqi sizda' },
    { icon: '✅', text: "Narx oldindan belgilanadi — o\u2018zgarmaydi" },
    { icon: '✅', text: 'Bekor qilish kamida 1 soat oldin' },
    { icon: '❌', text: "Soxta so\u2018rov yuborish taqiqlanadi" },
    { icon: '❌', text: 'Haydovchiga hurmat bilan muomala qiling' },
  ];

  const driverRules = [
    { icon: '✅', text: "Tasdiqlangan yo\u2018lovchilargina ko\u2018rasiz" },
    { icon: '✅', text: "Narxni o\u2018zingiz belgilaysiz" },
    { icon: '❌', text: "Qabul qilgan so\u2018rovni bekor qilmang" },
    { icon: '❌', text: 'Narxni oshirish taqiqlanadi' },
    { icon: '❌', text: "Mashina toza bo\u2018lishi shart" },
  ];

  const rules = role === 'passenger' ? passengerRules : driverRules;

  return (
    <div className="safe-bottom flex min-h-[calc(100dvh-1px)] flex-col px-5 py-6">
      <button
        className="mb-4 w-fit text-sm font-extrabold text-primary transition active:scale-[0.97]"
        onClick={() => {
          hapticTap();
          onBack();
        }}
      >
        ← Orqaga
      </button>

      <StepIndicator current={2} total={3} />

      <h2 className="mt-6 text-2xl font-extrabold text-slate-900">Safargo qoidalari</h2>

      <div className="mt-6 flex-1">
        <Card>
          <div className="space-y-3">
            {rules.map((rule) => (
              <div key={rule.text} className="flex items-start gap-3">
                <span className="mt-0.5 text-base leading-none">{rule.icon}</span>
                <p className="text-sm font-bold leading-snug text-slate-700">{rule.text}</p>
              </div>
            ))}
          </div>
        </Card>

        <label className="mt-6 flex cursor-pointer items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-4 transition active:scale-[0.99]">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => {
              hapticTap();
              onAgreeChange(e.target.checked);
            }}
            className="h-5 w-5 accent-primary"
          />
          <span className="text-sm font-extrabold text-slate-800">Qoidalarga roziman</span>
        </label>

        {error ? (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600">{error}</p>
        ) : null}
      </div>

      <Button className="mt-6 w-full" onClick={onComplete} disabled={!agreed || isSaving}>
        {isSaving ? 'Saqlanmoqda...' : 'Safargoga kirish →'}
      </Button>
    </div>
  );
};

/* ═══════════════════════════════════════════════
   Main Onboarding Screen
   ═══════════════════════════════════════════════ */
export const OnboardingScreen = ({ role, onComplete }: OnboardingProps) => {
  const identity = getTelegramIdentity();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward');

  // Shared fields
  const [name, setName] = useState(identity.name);
  const [phone, setPhone] = useState('+998');

  // Passenger fields
  const [gender, setGender] = useState<Gender | undefined>(undefined);

  // Driver fields
  const [carModel, setCarModel] = useState('');
  const [carYear, setCarYear] = useState('2020');
  const [carPlate, setCarPlate] = useState('');

  // Validation
  const [phoneError, setPhoneError] = useState('');
  const [carYearError, setCarYearError] = useState('');
  const [carPlateError, setCarPlateError] = useState('');

  // Rules step
  const [agreed, setAgreed] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const goForward = useCallback(() => {
    setDirection('forward');
    setStep((s) => s + 1);
  }, []);

  const goBack = useCallback(() => {
    setDirection('backward');
    setStep((s) => Math.max(0, s - 1));
  }, []);

  const validateSetupStep = useCallback((): boolean => {
    let valid = true;
    setPhoneError('');
    setCarYearError('');
    setCarPlateError('');

    // Phone validation (required for driver, optional for passenger but validate format if entered)
    const trimmedPhone = phone.replace(/\s/g, '');
    if (role === 'driver') {
      if (!validatePhone(trimmedPhone)) {
        setPhoneError("Telefon raqamni to'g'ri kiriting");
        valid = false;
      }
    } else if (trimmedPhone.length > 4 && !validatePhone(trimmedPhone)) {
      // Passenger: validate only if they typed something beyond +998
      setPhoneError("Telefon raqamni to'g'ri kiriting");
      valid = false;
    }

    if (role === 'driver') {
      if (!carModel) {
        valid = false;
      }

      const yearNum = Number(carYear);
      if (!carYear || yearNum < 2000 || yearNum > 2025) {
        setCarYearError('2000–2025 orasida kiriting');
        valid = false;
      }

      if (!carPlate.trim()) {
        setCarPlateError('Mashina raqamini kiriting');
        valid = false;
      }
    }

    return valid;
  }, [carModel, carPlate, carYear, phone, role]);

  const handleSetupNext = useCallback(() => {
    if (validateSetupStep()) {
      goForward();
    }
  }, [goForward, validateSetupStep]);

  const handleComplete = useCallback(async () => {
    setIsSaving(true);
    setSaveError('');

    try {
      const userId = identity.id;
      const trimmedPhone = phone.replace(/\s/g, '');
      const phoneToSave = trimmedPhone.length > 4 ? trimmedPhone : '';

      if (role === 'passenger') {
        await updateUserOnboarding(userId, phoneToSave, gender);
      } else {
        // Driver: save driver profile + update user phone
        const yearNum = Number(carYear) || 2020;
        await saveDriverProfile(userId, carModel, yearNum, phoneToSave, name.trim() || identity.name);
        await updateUserOnboarding(userId, phoneToSave);
      }

      localStorage.setItem('safargo_onboarded', 'true');
      hapticSuccess();
      onComplete();
    } catch (err) {
      console.error('Onboarding save error:', err);
      setSaveError(toUzbekErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  }, [carModel, carYear, gender, identity.id, identity.name, name, onComplete, phone, role]);

  const animClass = direction === 'forward' ? 'onboarding-forward' : 'onboarding-backward';

  if (step === 0) {
    return <WelcomeStep onNext={goForward} />;
  }

  if (step === 1) {
    return (
      <div key="step-1" className={animClass}>
        {role === 'passenger' ? (
          <PassengerSetupStep
            name={name}
            phone={phone}
            gender={gender}
            phoneError={phoneError}
            onNameChange={setName}
            onPhoneChange={setPhone}
            onGenderChange={setGender}
            onNext={handleSetupNext}
            onBack={goBack}
          />
        ) : (
          <DriverSetupStep
            name={name}
            phone={phone}
            carModel={carModel}
            carYear={carYear}
            carPlate={carPlate}
            phoneError={phoneError}
            carYearError={carYearError}
            carPlateError={carPlateError}
            onNameChange={setName}
            onPhoneChange={setPhone}
            onCarModelChange={setCarModel}
            onCarYearChange={setCarYear}
            onCarPlateChange={setCarPlate}
            onNext={handleSetupNext}
            onBack={goBack}
          />
        )}
      </div>
    );
  }

  return (
    <div key="step-2" className={animClass}>
      <RulesStep
        role={role}
        agreed={agreed}
        isSaving={isSaving}
        error={saveError}
        onAgreeChange={setAgreed}
        onComplete={() => void handleComplete()}
        onBack={goBack}
      />
    </div>
  );
};
