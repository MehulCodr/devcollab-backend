export const securityAlertTemplate = (message, details = "") => `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="color: #DC2626;">DevCollaborator Security Alert</h2>
  <p>${message}</p>
  ${details ? `<pre style="background: #fef2f2; color: #991b1b; padding: 10px; border-radius: 5px; border: 1px solid #f87171;">${details}</pre>` : ''}
  <p>Please investigate this immediately.</p>
</div>
`;
