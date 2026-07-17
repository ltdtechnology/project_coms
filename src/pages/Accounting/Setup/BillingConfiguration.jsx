import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import {
  getBillingConfigurations,
  createBillingConfiguration,
  updateBillingConfiguration,
  uploadBillingLogo,
  previewCamBills,
  generateCamBills,
  exportCamStatementPdf,
  downloadCamBillPdf,
  sendCamBillEmail,
} from '../../../api/accountingApi';
import { getSites } from '../../../api';

const BillingConfiguration = () => {
  const [loading, setLoading] = useState(false);
  const [logoSource, setLogoSource] = useState(null); // 'url' | 'upload' | null
  const [pendingLogoFile, setPendingLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [isEditing, setIsEditing] = useState(true);
  const [hasConfig, setHasConfig] = useState(false);
  const [sites, setSites] = useState([]);
  const [siteId, setSiteId] = useState('');
  const [billingYear, setBillingYear] = useState(new Date().getFullYear());
  const [billingMonth, setBillingMonth] = useState(new Date().getMonth() + 1);
  const [billingPreview, setBillingPreview] = useState(null);
  const [billingRows, setBillingRows] = useState([]);
  const [statementUnitId, setStatementUnitId] = useState('');
  const [selectedBill, setSelectedBill] = useState(null);
  const [showBillDetailsModal, setShowBillDetailsModal] = useState(false);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState('');
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [formData, setFormData] = useState({
    company_name: '',
    company_logo: '',
    gst_number: '',
    pan_number: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    phone: '',
    email: '',
    website: '',
    bank_name: '',
    account_number: '',
    ifsc_code: '',
    branch_name: '',
    favouring_name: '',
    account_type: '',
    swift_code: '',
    terms_and_conditions: '',
    enable_gst_split: false,
    enable_igst: false,
    society_maintenance_percent: '',
    management_fees_label: 'Management Fees',
    management_fees_enabled: false,
    supply_site_name: ''
  });

  useEffect(() => {
    fetchBillingConfig();
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const res = await getSites();
      const list = res?.data?.data || res?.data || [];
      setSites(Array.isArray(list) ? list : []);
      if (!siteId && Array.isArray(list) && list.length > 0) {
        const firstId = list[0]?.id || list[0]?.site_id || list[0]?.value;
        if (firstId) setSiteId(String(firstId));
      }
    } catch (err) {
      console.error('Failed to load sites for billing panel', err);
    }
  };

  const fetchBillingConfig = async () => {
    setLoading(true);
    try {
      const response = await getBillingConfigurations();
      const data = response.data;
      if (Array.isArray(data) && data.length > 0) {
        setFormData(data[0]);
        setLogoSource(data[0].company_logo ? 'url' : null);
        setLogoPreview(data[0].company_logo || null);
        setHasConfig(true);
        setIsEditing(false);
      } else if (data && typeof data === 'object') {
        setFormData(data);
        setLogoSource(data.company_logo ? 'url' : null);
        setLogoPreview(data.company_logo || null);
        setHasConfig(true);
        setIsEditing(false);
      } else {
        setHasConfig(false);
        setIsEditing(true);
      }
    } catch (error) {
      console.error('Error fetching billing config:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = formData.id
        ? await updateBillingConfiguration(formData.id, { billing_configuration: formData })
        : await createBillingConfiguration({ billing_configuration: formData });

      if (response.data.success) {
        let configId = formData.id;
        if (!configId) {
          configId =
            response.data?.data?.id ||
            response.data?.billing_configuration?.id ||
            response.data?.id ||
            null;
        }

        if (pendingLogoFile && configId) {
          try {
            const formDataToSend = new FormData();
            formDataToSend.append('logo', pendingLogoFile);
            const logoResponse = await uploadBillingLogo(configId, formDataToSend);
            const url = logoResponse?.data?.logo_url;
            if (url) {
              setFormData((prev) => ({
                ...prev,
                company_logo: url
              }));
              setLogoSource('upload');
              setLogoPreview(url);
            } else {
              toast.error('Logo upload succeeded but URL was not returned');
            }
          } catch (logoError) {
            console.error('Error uploading logo during save:', logoError);
            toast.error('Billing configuration saved, but logo upload failed');
          } finally {
            setPendingLogoFile(null);
          }
        }

        toast.success(response.data.message);
        fetchBillingConfig();
      }
    } catch (error) {
      console.error('Error saving billing config:', error);
      toast.error('Failed to save billing configuration');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const updated = {
      ...formData,
      [name]: value
    };

    if (name === 'company_logo') {
      // If URL is provided, mark source as 'url'; if cleared, allow both again
      if (value && value.trim().length > 0) {
        setLogoSource('url');
      } else if (logoSource === 'url') {
        setLogoSource(null);
      }
    }

    setFormData(updated);
  };

  const handleLogoUpload = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    if (logoPreview) {
      URL.revokeObjectURL(logoPreview);
    }
    const previewUrl = URL.createObjectURL(file);
    setPendingLogoFile(file);
    setLogoPreview(previewUrl);
    setLogoSource('upload');
  };

  const handlePreviewCamBills = async () => {
    if (!siteId) {
      toast.error('Please select a site for billing preview');
      return;
    }
    try {
      setLoading(true);
      const res = await previewCamBills({ year: billingYear, month: billingMonth, site_id: siteId });
      const rows = res?.data?.data || res?.data || [];
      const total = Array.isArray(rows)
        ? rows.reduce((sum, r) => sum + Number(r.total_amount || 0), 0)
        : 0;
      setBillingPreview({ count: Array.isArray(rows) ? rows.length : 0, total });
      setBillingRows(Array.isArray(rows) ? rows : []);
      if (!rows.length) {
        toast('No billable units found for this period');
      } else {
        toast.success('Preview ready');
      }
    } catch (err) {
      console.error('Failed to preview CAM bills from BillingConfiguration', err);
      toast.error('Preview failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateCamBills = async () => {
    if (!siteId) {
      toast.error('Please select a site for bill generation');
      return;
    }
    try {
      setLoading(true);
      const res = await generateCamBills({ year: billingYear, month: billingMonth, site_id: siteId });
      const rows = res?.data?.data || res?.data || [];
      const count = Array.isArray(rows) ? rows.length : 0;
      setBillingPreview({ count, total: Array.isArray(rows) ? rows.reduce((sum, r) => sum + Number(r.total_amount || 0), 0) : 0 });
      setBillingRows(Array.isArray(rows) ? rows : []);
      toast.success(`Generated CAM bills for ${count} unit(s)`);
    } catch (err) {
      console.error('Failed to generate CAM bills from BillingConfiguration', err);
      toast.error('Generate failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadCamStatement = async () => {
    if (!statementUnitId) {
      toast.error('Please enter a Unit ID to download the CAM statement');
      return;
    }
    try {
      setLoading(true);
      const startDate = `${billingYear}-${String(billingMonth).padStart(2, '0')}-01`;
      const lastDay = new Date(billingYear, billingMonth, 0).getDate();
      const endDate = `${billingYear}-${String(billingMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
      const response = await exportCamStatementPdf({ unit_id: statementUnitId, start_date: startDate, end_date: endDate });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cam_statement_${statementUnitId}_${billingYear}_${billingMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('CAM statement PDF download started');
    } catch (err) {
      console.error('Failed to download CAM statement PDF', err);
      toast.error('Download failed');
    } finally {
      setLoading(false);
    }
  };

  const handleViewBillDetails = (row) => {
    setSelectedBill(row);
    setShowBillDetailsModal(true);
  };

  const handleDownloadCamBillPdf = async (bill) => {
    try {
      setLoading(true);
      const startDate = `${bill.year}-${String(bill.month).padStart(2, "0")}-01`;
      const lastDay = new Date(bill.year, bill.month, 0).getDate();
      const endDate = `${bill.year}-${String(bill.month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      const response = await downloadCamBillPdf({
        unit_id: bill.unit_id,
        start_date: startDate,
        end_date: endDate,
        template: "invoice",
        remark_1: "Any Debit / Credit of expenses will be adjusted in next statement of expenses.",
        remark_2: "This is a computer generated statement, signature is not required.",
        remark_3: "For queries write to the management office.",
        remark_4: "These are consolidated expenses for the selected period.",
      });
      if (response.data?.type === "application/json") {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        throw new Error(errorData.error || "PDF generation failed");
      }
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `cam_bill_${bill.unit_id}_${bill.year}_${bill.month}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('CAM bill PDF downloaded successfully');
    } catch (err) {
      console.error('Failed to download CAM bill PDF', err);
      toast.error('PDF download failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendBillEmail = async () => {
    if (!selectedBill) {
      toast.error('No bill selected');
      return;
    }
    if (!emailRecipient || !emailRecipient.includes('@')) {
      toast.error('Please enter a valid email address');
      return;
    }
    try {
      setSendingEmail(true);
      await sendCamBillEmail({
        unit_id: selectedBill.unit_id,
        year: selectedBill.year,
        month: selectedBill.month,
        recipient_email: emailRecipient,
      });
      toast.success(`CAM bill email sent to ${emailRecipient}`);
      setShowEmailModal(false);
      setEmailRecipient('');
    } catch (err) {
      console.error('Failed to send CAM bill email', err);
      toast.error('Email sending failed');
    } finally {
      setSendingEmail(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Billing Configuration</h2>
          <p className="text-gray-600 mt-1">Configure Society details for invoice generation</p>
        </div>
        {hasConfig && (
          <button
            type="button"
            onClick={() => setIsEditing((prev) => !prev)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            {isEditing ? 'Cancel' : 'Edit'}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Society Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Society Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Society Name *
              </label>
              <input
                type="text"
                name="company_name"
                value={formData.company_name}
                onChange={handleChange}
                required
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Society Logo URL
              </label>
              <input
                type="text"
                name="company_logo"
                value={formData.company_logo}
                onChange={handleChange}
                disabled={!isEditing || logoSource === 'upload'}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2 disabled:bg-gray-100 disabled:cursor-not-allowed"
              />
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Or Upload Logo
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                disabled={!isEditing || logoSource === 'url'}
                className="w-full text-sm text-gray-700 disabled:text-gray-400 disabled:cursor-not-allowed"
              />
              {(logoPreview || formData.company_logo) && (
                <div className="mt-3">
                  <p className="text-xs text-gray-500 mb-1">Logo Preview</p>
                  <img
                    src={logoPreview || formData.company_logo}
                    alt="Society Logo"
                    className="h-12 object-contain border border-gray-200 rounded"
                  />
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                GST Number
              </label>
              <input
                type="text"
                name="gst_number"
                value={formData.gst_number}
                onChange={handleChange}
                placeholder="22AAAAA0000A1Z5"
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                PAN Number
              </label>
              <input
                type="text"
                name="pan_number"
                value={formData.pan_number}
                onChange={handleChange}
                placeholder="AAAAA0000A"
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Phone
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Website
              </label>
              <input
                type="url"
                name="website"
                value={formData.website}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Address Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows="3"
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                City
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                State
              </label>
              <input
                type="text"
                name="state"
                value={formData.state}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pincode
              </label>
              <input
                type="text"
                name="pincode"
                value={formData.pincode}
                onChange={handleChange}
                placeholder="400001"
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Bank Details */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Bank Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bank Name
              </label>
              <input
                type="text"
                name="bank_name"
                value={formData.bank_name}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Branch Name
              </label>
              <input
                type="text"
                name="branch_name"
                value={formData.branch_name}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Number
              </label>
              <input
                type="text"
                name="account_number"
                value={formData.account_number}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                IFSC Code
              </label>
              <input
                type="text"
                name="ifsc_code"
                value={formData.ifsc_code}
                onChange={handleChange}
                placeholder="SBIN0000123"
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Favouring Name
              </label>
              <input
                type="text"
                name="favouring_name"
                value={formData.favouring_name}
                onChange={handleChange}
                placeholder="Cheque / NEFT in favour of"
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Account Type
              </label>
              <select
                name="account_type"
                value={formData.account_type}
                onChange={handleChange}
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select Account Type</option>
                <option value="Savings">Savings</option>
                <option value="Current">Current</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                SWIFT Code
              </label>
              <input
                type="text"
                name="swift_code"
                value={formData.swift_code}
                onChange={handleChange}
                placeholder="SBININBB"
                disabled={!isEditing}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Society Maintenance Charges */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">{formData.management_fees_label || 'Management Fees'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="flex items-center gap-3">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  name="management_fees_enabled"
                  checked={!!formData.management_fees_enabled}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      management_fees_enabled: e.target.checked,
                    }))
                  }
                  disabled={!isEditing}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-700">Enable Management Fees</span>
              </label>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Label / Name
              </label>
              <input
                type="text"
                name="management_fees_label"
                value={formData.management_fees_label || ''}
                onChange={handleChange}
                placeholder="e.g. Management Fees"
                disabled={!isEditing || !formData.management_fees_enabled}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {formData.management_fees_label || 'Management Fees'} Percentage (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  name="society_maintenance_percent"
                  value={formData.society_maintenance_percent || ''}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      society_maintenance_percent: e.target.value,
                    }))
                  }
                  placeholder="e.g. 8"
                  min="0"
                  max="100"
                  step="0.01"
                  disabled={!isEditing || !formData.management_fees_enabled}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 font-medium">%</span>
              </div>
            </div>
          </div>
          {formData.management_fees_enabled && Number(formData.society_maintenance_percent) > 0 && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">Management Fee: {formData.society_maintenance_percent}%</span>
                <br />
                <span className="text-xs text-blue-600">
                  This {formData.management_fees_label || 'Management Fees'} charge will be applied on total expenses in billing &amp; unit statements.
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Terms & Conditions */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Terms & Conditions</h3>
          <textarea
            name="terms_and_conditions"
            value={formData.terms_and_conditions}
            onChange={handleChange}
            rows="5"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter billing terms and conditions..."
            disabled={!isEditing}
          />
        </div>

        {/* Billing Quick Actions (CAM Bills) */}
        {/* <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Billing Quick Actions</h3>
          <p className="text-sm text-gray-600 mb-4">
            Use this panel to quickly preview or generate CAM bills for a selected month. For detailed per-unit
            review, use the "Accounting Bills" tab.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Site</label>
              <select
                value={siteId}
                onChange={(e) => setSiteId(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                <option value="">Select site</option>
                {sites.map((s) => {
                  const id = s.id || s.site_id || s.value;
                  const name = s.name || s.site_name || s.label || `Site ${id}`;
                  return (
                    <option key={id} value={id}>
                      {name}
                    </option>
                  );
                })}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
              <input
                type="number"
                value={billingYear}
                onChange={(e) => setBillingYear(Number(e.target.value) || new Date().getFullYear())}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Month</label>
              <select
                value={billingMonth}
                onChange={(e) => setBillingMonth(Number(e.target.value) || 1)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              >
                {[1,2,3,4,5,6,7,8,9,10,11,12].map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Unit ID</label>
              <input
                type="text"
                value={statementUnitId}
                onChange={(e) => setStatementUnitId(e.target.value)}
                placeholder="e.g. 101"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 flex-wrap md:justify-end">
              <button
                type="button"
                onClick={handlePreviewCamBills}
                className="px-3 py-2 bg-gray-100 text-gray-800 rounded-lg text-sm border border-gray-300 hover:bg-gray-200"
              >
                Preview Bills
              </button>
              <button
                type="button"
                onClick={handleGenerateCamBills}
                className="px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700"
              >
                Generate Bills
              </button>
              <button
                type="button"
                onClick={handleDownloadCamStatement}
                className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700"
              >
                Download CAM Statement PDF
              </button>
            </div>
          </div>
          {billingPreview && (
            <div className="mt-4 text-sm text-gray-700">
              <p>
                Preview for <span className="font-medium">{billingMonth}/{billingYear}</span> –
                <span className="font-medium"> {billingPreview.count}</span> unit(s), total
                <span className="font-medium"> ₹{billingPreview.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </p>
            </div>
          )}
          {billingRows.length > 0 && (
            <div className="mt-4 overflow-x-auto">
              <div className="min-w-full bg-white border border-gray-200 rounded-lg">
                <div className="px-4 py-3 border-b border-gray-200">
                  <p className="text-sm font-semibold text-gray-700">Sample CAM bill totals</p>
                  <p className="text-xs text-gray-500">Advance deduction is applied on the first CAM month if configured.</p>
                </div>
                <table className="min-w-full text-left text-sm text-gray-600">
                  <thead>
                    <tr>
                      <th className="px-4 py-3 border-b border-gray-200">Unit ID</th>
                      <th className="px-4 py-3 border-b border-gray-200">Base</th>
                      <th className="px-4 py-3 border-b border-gray-200">GST</th>
                      <th className="px-4 py-3 border-b border-gray-200">Advance</th>
                      <th className="px-4 py-3 border-b border-gray-200">Total</th>
                      <th className="px-4 py-3 border-b border-gray-200">View</th>
                      <th className="px-4 py-3 border-b border-gray-200">Download</th>
                      <th className="px-4 py-3 border-b border-gray-200">Send Mail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {billingRows.slice(0, 8).map((row) => (
                      <tr key={`${row.unit_id}-${row.year}-${row.month}`}>
                        <td className="px-4 py-3 border-b border-gray-100">{row.unit_id}</td>
                        <td className="px-4 py-3 border-b border-gray-100">₹{Number(row.base_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 border-b border-gray-100">₹{Number(row.gst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 border-b border-gray-100">₹{Number(row.advance_deduction || row.advance_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 border-b border-gray-100 font-semibold text-green-700">₹{Number(row.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td className="px-4 py-3 border-b border-gray-100 text-center">
                          <button
                            onClick={() => handleViewBillDetails(row)}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                            title="View detailed breakdown"
                          >
                            👁️ View
                          </button>
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 text-center">
                          <button
                            onClick={() => handleDownloadCamBillPdf(row)}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors"
                            title="Download PDF"
                          >
                            ⬇️ PDF
                          </button>
                        </td>
                        <td className="px-4 py-3 border-b border-gray-100 text-center">
                          <button
                            onClick={() => {
                              setSelectedBill(row);
                              setShowEmailModal(true);
                            }}
                            className="inline-flex items-center justify-center px-3 py-1.5 text-xs font-medium bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors"
                            title="Send via email"
                          >
                            ✉️ Mail
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div> */}

        {isEditing && (
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 transition-colors"
            >
              {loading ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        )}
      </form>

      {/* CAM Bill Details Modal */}
      {showBillDetailsModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-4 max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">CAM Bill Details</h3>
              <button
                onClick={() => setShowBillDetailsModal(false)}
                className="text-white hover:bg-blue-800 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Unit & Period Info */}
              <div className="border-b pb-3">
                <p className="text-sm text-gray-600">Unit ID</p>
                <p className="text-lg font-semibold text-gray-800">{selectedBill.unit_id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4 border-b pb-3">
                <div>
                  <p className="text-sm text-gray-600">Period</p>
                  <p className="text-sm font-semibold text-gray-800">{selectedBill.month}/{selectedBill.year}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Carpet Area</p>
                  <p className="text-sm font-semibold text-gray-800">{Number(selectedBill.carpet_area_sqft || 0).toFixed(2)} sqft</p>
                </div>
              </div>

              {/* Days Information */}
              <div className="bg-gray-50 p-3 rounded border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Active Days</p>
                <p className="text-lg font-bold text-gray-800">{selectedBill.active_days} days</p>
              </div>

              {/* Rate Information */}
              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                <p className="text-sm text-gray-600">Daily Rate</p>
                <p className="text-sm font-semibold text-gray-800">
                  ₹{Number(selectedBill.daily_rate_per_sqft || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })} per sqft per day
                </p>
              </div>

              {/* Calculation Breakdown */}
              <div className="space-y-2 border-t pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Base Amount:</span>
                  <span className="font-semibold text-gray-800">₹{Number(selectedBill.base_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Society Charges ({selectedBill.gst_rate_percent}%):</span>
                  <span className="font-semibold text-gray-800">₹{Number(selectedBill.gst_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                </div>
                {Number(selectedBill.advance_deduction || 0) > 0 && (
                  <div className="flex justify-between items-center text-orange-600">
                    <span className="text-sm">Advance Deduction:</span>
                    <span className="font-semibold">-₹{Number(selectedBill.advance_deduction || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
              </div>

              {/* Total */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded border border-green-200 flex justify-between items-center">
                <span className="font-bold text-gray-800">Total Due:</span>
                <span className="text-xl font-bold text-green-700">₹{Number(selectedBill.total_amount || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    handleDownloadCamBillPdf(selectedBill);
                    setShowBillDetailsModal(false);
                  }}
                  className="flex-1 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  Download PDF
                </button>
                <button
                  onClick={() => {
                    setShowBillDetailsModal(false);
                    setShowEmailModal(true);
                  }}
                  className="flex-1 px-3 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium"
                >
                  Send Email
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Send Email Modal */}
      {showEmailModal && selectedBill && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-sm w-full mx-4">
            <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white px-6 py-4 flex justify-between items-center">
              <h3 className="text-lg font-bold">Send CAM Bill</h3>
              <button
                onClick={() => {
                  setShowEmailModal(false);
                  setEmailRecipient('');
                }}
                className="text-white hover:bg-purple-800 p-1 rounded"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">
                  Sending CAM bill for Unit <span className="font-bold">{selectedBill.unit_id}</span> ({selectedBill.month}/{selectedBill.year})
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient Email Address *
                </label>
                <input
                  type="email"
                  value={emailRecipient}
                  onChange={(e) => setEmailRecipient(e.target.value)}
                  placeholder="resident@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                <p className="text-xs text-purple-800">
                  The bill details and PDF attachment will be sent to the email address above.
                </p>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setShowEmailModal(false);
                    setEmailRecipient('');
                  }}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendBillEmail}
                  disabled={sendingEmail || !emailRecipient}
                  className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 font-medium"
                >
                  {sendingEmail ? 'Sending...' : 'Send Email'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BillingConfiguration;
