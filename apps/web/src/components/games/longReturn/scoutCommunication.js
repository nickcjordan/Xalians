// Presentation of registry communication channels, not new signaling capabilities.
const channels = {
  vibration: { label: 'Vibrations', action: 'sends a pattern of vibrations through the structure, carrying its findings to the waiting crew' },
  display: { label: 'Visual signals', action: 'signals back with visible gestures and changes of posture. The waiting crew can see the message from the entrance' },
  vocal: { label: 'Vocal calls', action: 'calls back across the chamber. The pattern of calls carries its findings to the waiting crew' },
  telepathic: { label: 'Shared images', action: 'shares an impression of the route directly with the waiting crew: images and feelings, without a spoken word' },
  chemical: { label: 'Scent signals', action: 'sends a scent signal back to the waiting crew, carrying its findings' }
};

export function scoutCommunication(channel) {
  return channels[channel] || { label: 'Remote signal', action: 'signals its findings back to the waiting crew' };
}

export function reportDeliveryLabel(report) {
  if (report.outcome === 'blind') return 'No scout sent';
  if (report.channel === 'physical return') return 'Back with the crew';
  return report.channel ? `${scoutCommunication(report.channel).label} received` : 'Waiting for the scout';
}
