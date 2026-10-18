import { ShieldCheck } from "lucide-react";
export default function AccessProofPage() {
  return (
    <section className="product-domain">
      <div className="domain-heading">
        <ShieldCheck size={18} />
        <div>
          <h2>Permission matrix</h2>
          <p>The public oracle is independent of the policy implementation.</p>
        </div>
      </div>
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>Identity</th>
              <th>Own tenant read</th>
              <th>Document update</th>
              <th>Owner transfer</th>
              <th>Other tenant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Owner</td>
              <td>Allow</td>
              <td>Allow</td>
              <td>Allow</td>
              <td>Deny</td>
            </tr>
            <tr>
              <td>Member</td>
              <td>Allow</td>
              <td>Deny</td>
              <td>Deny</td>
              <td>Deny</td>
            </tr>
            <tr>
              <td>Contractor</td>
              <td>Assigned only</td>
              <td>Deny</td>
              <td>Deny</td>
              <td>Deny</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div className="domain-foot">
        Two tenants · three personas · four resources. Attachment checks cover
        application metadata.
      </div>
    </section>
  );
}
