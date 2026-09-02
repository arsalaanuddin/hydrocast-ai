import React, { useState } from 'react';
import { 
  Building2, 
  Send, 
  CheckCircle, 
  AlertOctagon, 
  MessageSquare, 
  Radio, 
  PhoneCall, 
  ShieldAlert,
  X 
} from 'lucide-react';

interface MunicipalAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
  leadTimeMinutes: number;
  peakDepth: number;
}

interface MunicipalityContact {
  wardName: string;
  wardCode: string;
  officer: string;
  phone: string;
  hq: string;
  distanceKm: number;
  status: 'Critical Alert' | 'Warning' | 'Standby';
}

const MUNICIPAL_CENTERS: MunicipalityContact[] = [
  {
    wardName: 'BMC Ward F/North (Dadar/Matunga)',
    wardCode: 'BMC-FN',
    officer: 'Mr. S. K. Patil (Asst. Commissioner)',
    phone: '+91 22 2401 2474',
    hq: 'Matunga East, Mumbai',
    distanceKm: 1.2,
    status: 'Critical Alert',
  },
  {
    wardName: 'BMC Ward L (Kurla West Command)',
    wardCode: 'BMC-L',
    officer: 'Dr. V. B. More (Disaster Officer)',
    phone: '+91 22 2650 5109',
    hq: 'LBS Marg, Kurla',
    distanceKm: 2.8,
    status: 'Critical Alert',
  },
  {
    wardName: 'BMC Ward H/East (Santacruz/Milan)',
    wardCode: 'BMC-HE',
    officer: 'Mrs. R. Sharma (Ward Control Head)',
    phone: '+91 22 2618 2217',
    hq: 'Prabhat Colony, Santacruz',
    distanceKm: 3.4,
    status: 'Warning',
  },
];

export const MunicipalAlertModal: React.FC<MunicipalAlertModalProps> = ({
  isOpen,
  onClose,
  leadTimeMinutes,
  peakDepth,
}) => {
  const [selectedWard, setSelectedWard] = useState<MunicipalityContact>(MUNICIPAL_CENTERS[0]);
  const [channels, setChannels] = useState({
    whatsapp: true,
    capSms: true,
    sirenTrigger: false,
    ndrfWebhook: true,
  });
  const [isSending, setIsSending] = useState(false);
  const [dispatchSuccess, setDispatchSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSend = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setDispatchSuccess(true);
      setTimeout(() => {
        setDispatchSuccess(false);
        onClose();
      }, 2500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden flex flex-col text-slate-100 font-sans">
        
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5 text-rose-400">
            <Building2 className="w-5 h-5 text-rose-500" />
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Emergency Municipal Dispatcher
              </h2>
              <p className="text-[11px] text-slate-400">
                Direct Telemetry Link to Closest BMC Ward Control Centers
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 text-xs">
          
          {/* Target Ward Selector */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Select Target Municipal Ward HQ
            </label>
            <div className="space-y-1.5">
              {MUNICIPAL_CENTERS.map((muni) => (
                <div
                  key={muni.wardCode}
                  onClick={() => setSelectedWard(muni)}
                  className={`p-3 rounded-xl border cursor-pointer transition flex items-center justify-between ${
                    selectedWard.wardCode === muni.wardCode
                      ? 'bg-sky-500/15 border-sky-400/50 text-white'
                      : 'bg-slate-800/40 border-slate-800 text-slate-300 hover:bg-slate-800/80'
                  }`}
                >
                  <div>
                    <div className="font-bold flex items-center gap-1.5">
                      <span>{muni.wardName}</span>
                      <span className="text-[10px] font-mono text-sky-400 font-normal">({muni.distanceKm} km away)</span>
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      Contact: {muni.officer} &bull; <span className="font-mono text-slate-300">{muni.phone}</span>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono ${
                    muni.status === 'Critical Alert' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  }`}>
                    {muni.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Telemetry Summary Payload */}
          <div className="bg-slate-950/80 border border-slate-800 p-3.5 rounded-xl font-mono space-y-1 text-[11px]">
            <div className="text-slate-400 text-[10px] uppercase tracking-wider font-bold mb-1 flex items-center gap-1">
              <Radio className="w-3 h-3 text-sky-400" /> Outgoing CAP Alert Payload
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Lead Horizon:</span>
              <span className="text-sky-300">+{leadTimeMinutes} Minutes (Nowcast Window)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Predicted Inundation Depth:</span>
              <span className="text-amber-300 font-bold">{peakDepth.toFixed(1)} cm</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-500">Action Mandate:</span>
              <span className="text-rose-400 font-bold">Deploy Stormwater Pumps & Halt Low-lying Subways</span>
            </div>
          </div>

          {/* Dispatch Channels */}
          <div>
            <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
              Active Broadcast Protocols
            </label>
            <div className="grid grid-cols-2 gap-2">
              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-800 cursor-pointer hover:bg-slate-800/60">
                <input
                  type="checkbox"
                  checked={channels.whatsapp}
                  onChange={(e) => setChannels({ ...channels, whatsapp: e.target.checked })}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-slate-300 text-[11px]">WhatsApp Ward SOS</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-800 cursor-pointer hover:bg-slate-800/60">
                <input
                  type="checkbox"
                  checked={channels.capSms}
                  onChange={(e) => setChannels({ ...channels, capSms: e.target.checked })}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <PhoneCall className="w-3.5 h-3.5 text-sky-400" />
                <span className="text-slate-300 text-[11px]">Emergency CAP SMS</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-800 cursor-pointer hover:bg-slate-800/60">
                <input
                  type="checkbox"
                  checked={channels.ndrfWebhook}
                  onChange={(e) => setChannels({ ...channels, ndrfWebhook: e.target.checked })}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
                <span className="text-slate-300 text-[11px]">NDRF Ops Webhook</span>
              </label>

              <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/40 border border-slate-800 cursor-pointer hover:bg-slate-800/60">
                <input
                  type="checkbox"
                  checked={channels.sirenTrigger}
                  onChange={(e) => setChannels({ ...channels, sirenTrigger: e.target.checked })}
                  className="rounded border-slate-700 text-sky-500 focus:ring-0"
                />
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-slate-300 text-[11px]">Automated Sump Siren</span>
              </label>
            </div>
          </div>

        </div>

        {/* Action Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            Cancel
          </button>

          <button
            onClick={handleSend}
            disabled={isSending || dispatchSuccess}
            className={`px-5 py-2.5 rounded-xl font-bold font-mono text-xs uppercase tracking-wider transition-all flex items-center gap-2 shadow-lg ${
              dispatchSuccess
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-gradient-to-r from-rose-500 to-red-600 hover:from-rose-400 hover:to-red-500 text-white shadow-rose-500/20 active:scale-95'
            }`}
          >
            {dispatchSuccess ? (
              <>
                <CheckCircle className="w-4 h-4" />
                <span>Alert Dispatched to {selectedWard.wardCode}!</span>
              </>
            ) : isSending ? (
              <span>Dispatching Encrypted Alert...</span>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>Notify Nearest Municipality</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
};