export const adminNotificationTemplate = (message, details = "") => `
<div style="font-family: Arial, sans-serif; padding: 20px;">
  <h2 style="color: #6366F1;">DevCollaborator Admin Notification</h2>
  <p>${message}</p>
  ${details ? `<pre style="background: #f4f4f5; padding: 10px; border-radius: 5px;">${details}</pre>` : ''}
</div>
`;
