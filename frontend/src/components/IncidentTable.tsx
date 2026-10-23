import {
  formatDetectionTime,
  formatLabel,
  type DemoIncident,
} from '../data/demoIncidents'

type IncidentTableProps = {
  incidents: DemoIncident[]
  caption: string
  onSelect?: (id: string, service: string) => void
}

function IncidentTable({ incidents, caption, onSelect }: IncidentTableProps) {
  return (
    <div className="table-wrap">
      <table className="incident-table">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            <th>Incident</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Service</th>
            <th>Detected</th>
          </tr>
        </thead>
        <tbody>
          {incidents.map((incident) => (
            <tr
              key={incident.id}
              className={onSelect ? 'is-clickable' : undefined}
              tabIndex={onSelect ? 0 : undefined}
              onClick={() => onSelect?.(incident.id, incident.service)}
              onKeyDown={(e) => {
                if (onSelect && e.key === 'Enter') onSelect(incident.id, incident.service)
              }}
            >
              <td>
                <span className="incident-title">{incident.title}</span>
                <span className="incident-id">{incident.id}</span>
              </td>
              <td>
                <span className={`badge severity-${incident.severity}`}>
                  {formatLabel(incident.severity)}
                </span>
              </td>
              <td>
                <span className={`badge status-${incident.status}`}>
                  {formatLabel(incident.status)}
                </span>
              </td>
              <td>
                <code>{incident.service}</code>
              </td>
              <td className="nowrap">
                {formatDetectionTime(incident.detectedAt)} UTC
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default IncidentTable