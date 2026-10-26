const LABEL = {
  Pending: 'Awaiting review', Approved: 'Approved', Rejected: 'Rejected',
  Withdrawn: 'Withdrawn', Overdue: 'Overdue', 'Not submitted': 'Not submitted'
};
const CLS = {
  Pending: 'b-warn', Approved: 'b-ok', Rejected: 'b-bad',
  Withdrawn: '', Overdue: 'b-bad', 'Not submitted': ''
};

export function StatusBadge({ status }) {
  return <span className={'badge ' + CLS[status]}>{LABEL[status]}</span>;
}

export function TypeBadge({ type }) {
  return <span className={'badge t-' + type}>{type.toUpperCase()}</span>;
}
