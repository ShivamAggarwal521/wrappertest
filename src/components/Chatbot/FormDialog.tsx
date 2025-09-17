import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Send, CheckCircle, AlertCircle } from "lucide-react";

// ✅ Generate or retrieve a stable anonymous id
const getOrCreateSubmitterId = () => {
  try {
    let id = localStorage.getItem("submitter_id");
    if (!id) {
      id = `anon-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;
      localStorage.setItem("submitter_id", id);
    }
    return id;
  } catch {
    return `anon-${Date.now()}`;
  }
};

interface FormDialogProps {
  isOpen: boolean;
  onClose: () => void;
  formData: any;
  currentCategory?: string;
  userPreferences?: any;
  onSubmit?: (payload: any) => Promise<void>;
}

const FormDialog: React.FC<FormDialogProps> = ({
  isOpen,
  onClose,
  formData,
  currentCategory,
  userPreferences,
  onSubmit,
}) => {
  const [responses, setResponses] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  // ✅ Initialize responses when form opens
  useEffect(() => {
    if (formData?.questions && isOpen) {
      const initialResponses: Record<string, any> = {};
      formData.questions.forEach((q: any) => {
        initialResponses[q.id] = q.type === "checkbox" ? [] : "";
      });
      setResponses(initialResponses);
      setErrors({});
      setIsSubmitted(false);
    }
  }, [formData, isOpen]);

  // ✅ Form validation
  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    formData?.questions?.forEach((q: any) => {
      const value = responses[q.id];
      if (q.required && (!value || (Array.isArray(value) && value.length === 0))) {
        newErrors[q.id] = `${q.label} is required`;
      }
      if (q.type === "email" && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) newErrors[q.id] = "Please enter a valid email address";
      }
      if (q.type === "phone" && value) {
        const phoneRegex = /^\+?[\d\s-()]{10,}$/;
        if (!phoneRegex.test(value)) newErrors[q.id] = "Please enter a valid phone number";
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (id: string, value: any, type?: string, required?: boolean) => {
  setResponses((prev) => ({ ...prev, [id]: value }));

  // Real-time validation
  let errorMsg = "";
  if (required && (!value || (Array.isArray(value) && value.length === 0))) {
    errorMsg = "This field is required";
  } else if (type === "email" && value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) errorMsg = "Please enter a valid email address";
  } else if (type === "phone" && value) {
    const phoneRegex = /^\+?[\d\s-()]{10,}$/;
    if (!phoneRegex.test(value)) errorMsg = "Please enter a valid phone number";
  }

  setErrors((prev) => ({ ...prev, [id]: errorMsg }));
};

  // ✅ Submit handler
  const handleSubmit = async () => {
    if (!validateForm()) return;
    setIsSubmitting(true);
    try {
      const payload = {
        form_id: formData?._id || formData?.id,
        answers: responses,
        submitter_id: getOrCreateSubmitterId(),
        client_submitted_at: new Date().toISOString(),
        title: formData?.title,
      };
      if (onSubmit) await onSubmit(payload);
      setIsSubmitted(true);
      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
      }, 2000);
    } catch (err) {
      console.error("Form submission error:", err);
      setErrors({ general: "Failed to submit form. Please try again." });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ✅ Field renderer
  type QuestionType =
    | "text"
    | "email"
    | "phone"
    | "textarea"
    | "select"
    | "radio"
    | "checkbox"
    | "number"
    | "date";

  interface Question {
    id: string;
    label: string;
    type: QuestionType;
    required?: boolean;
    placeholder?: string;
    options?: string[];
  }

  const renderField = (q: Question) => {
    const baseStyles: React.CSSProperties = {
      width: "100%",
      padding: "12px 16px",
      border: `2px solid ${errors[q.id] ? "#ef4444" : userPreferences?.themeSettings?.border || "#e5e7eb"}`,
      borderRadius: "8px",
      fontSize: "14px",
      color: userPreferences?.themeSettings?.text || "#374151",
      background: userPreferences?.themeSettings?.background || "#ffffff",
      outline: "none",
      fontFamily: "inherit",
      transition: "all 0.2s ease",
    };

    const fieldMap: Record<QuestionType, React.ReactElement> = {
      text: (
        <input
          type="text"
          placeholder={q.placeholder}
          value={responses[q.id] || ""}
          onChange={(e) => handleInputChange(q.id, e.target.value)}
          style={baseStyles}
        />
      ),
      email: (
       <input
  type="email"
  placeholder={q.placeholder}
  value={responses[q.id] || ""}
  onChange={(e) => handleInputChange(q.id, e.target.value, q.type, q.required)}
  style={baseStyles}
/>
      ),
      phone: (
        <input
          type="tel"
          placeholder={q.placeholder}
          value={responses[q.id] || ""}
          onChange={(e) => handleInputChange(q.id, e.target.value)}
          style={baseStyles}
        />
      ),
      textarea: (
        <textarea
          rows={4}
          placeholder={q.placeholder}
          value={responses[q.id] || ""}
          onChange={(e) => handleInputChange(q.id, e.target.value)}
          style={{ ...baseStyles, resize: "vertical", minHeight: "100px" }}
        />
      ),
      select: (
        <select
          value={responses[q.id] || ""}
          onChange={(e) => handleInputChange(q.id, e.target.value)}
          style={baseStyles}
        >
          <option value="">Select {q.label}</option>
          {q.options?.map((opt: string) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      ),
      radio: (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {q.options?.map((opt: string) => (
            <label key={opt} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="radio"
                name={q.id}
                value={opt}
                checked={responses[q.id] === opt}
                onChange={(e) => handleInputChange(q.id, e.target.value)}
                style={{ accentColor: userPreferences?.colorTheme || "#4285f4" }}
              />
              <span style={{ fontSize: "14px", color: userPreferences?.themeSettings?.text || "#374151" }}>{opt}</span>
            </label>
          ))}
        </div>
      ),
      checkbox: (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {q.options?.map((opt: string) => (
            <label key={opt} style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={(responses[q.id] || []).includes(opt)}
                onChange={(e) => {
                  const current = responses[q.id] || [];
                  const updated = e.target.checked ? [...current, opt] : current.filter((v: string) => v !== opt);
                  handleInputChange(q.id, updated);
                }}
                style={{ accentColor: userPreferences?.colorTheme || "#4285f4" }}
              />
              <span style={{ fontSize: "14px", color: userPreferences?.themeSettings?.text || "#374151" }}>{opt}</span>
            </label>
          ))}
        </div>
      ),
      number: (
        <input
          type="number"
          placeholder={q.placeholder}
          value={responses[q.id] || ""}
          onChange={(e) => handleInputChange(q.id, e.target.value)}
          style={baseStyles}
        />
      ),
      date: (
        <input
          type="date"
          value={responses[q.id] || ""}
          onChange={(e) => handleInputChange(q.id, e.target.value)}
          style={baseStyles}
        />
      ),
    };

    return fieldMap[q.type as QuestionType] || (
      <input
        type="text"
        placeholder={q.placeholder}
        value={responses[q.id] || ""}
        onChange={(e) => handleInputChange(q.id, e.target.value)}
        style={baseStyles}
      />
    );
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {/* ✅ Overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: "fixed", inset: 0,
          backgroundColor: "rgba(0,0,0,0.5)",
          zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center",
          backdropFilter: "blur(4px)",
        }}
      >
        {/* ✅ Dialog */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, y: 50 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.8, opacity: 0, y: 50 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
          onClick={(e) => e.stopPropagation()}
          style={{
            background: userPreferences?.themeSettings?.surface || "#fff",
            borderRadius: "16px", padding: 0,
            width: "90%", maxWidth: "500px", maxHeight: "90vh",
            overflow: "hidden",
            border: `1px solid ${userPreferences?.themeSettings?.border || "#e5e7eb"}`,
            boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          }}
        >
          {/* ✅ Header */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "20px 24px",
            borderBottom: `1px solid ${userPreferences?.themeSettings?.border || "#e5e7eb"}`,
            background: userPreferences?.colorTheme || "#4285f4", color: "white",
          }}>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 600, textTransform: "capitalize" }}>
              {formData?.title || currentCategory}
            </h2>
            <motion.button
              onClick={onClose}
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              style={{
                background: "rgba(255,255,255,0.2)", border: "none",
                borderRadius: "50%", width: 32, height: 32,
                display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", color: "white",
              }}
            >
              <X size={18} />
            </motion.button>
          </div>

          {/* ✅ Body */}
          <div style={{ padding: "24px", maxHeight: "calc(90vh - 140px)", overflowY: "auto" }}>
            {isSubmitted ? (
              <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                style={{ textAlign: "center", padding: "40px 20px" }}>
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  style={{
                    width: 64, height: 64, background: "#22c55e", borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", color: "white",
                  }}
                >
                  <CheckCircle size={32} />
                </motion.div>
                <h3 style={{ margin: "0 0 8px", color: userPreferences?.themeSettings?.text || "#374151", fontSize: 18 }}>
                  Form Submitted Successfully!
                </h3>
                <p style={{ margin: 0, color: userPreferences?.themeSettings?.textSecondary || "#6b7280", fontSize: 14 }}>
                  Thank you for your response. This dialog will close automatically.
                </p>
              </motion.div>
            ) : (
              <div>
                {formData?.description && (
                  <div style={{
                    marginBottom: 24, padding: 16,
                    background: userPreferences?.themeSettings?.background || "#f8f9fa",
                    borderRadius: 8, border: `1px solid ${userPreferences?.themeSettings?.border || "#e5e7eb"}`,
                  }}>
                    <p style={{ margin: 0, color: userPreferences?.themeSettings?.textSecondary || "#6b7280", fontSize: 14, lineHeight: 1.5 }}>
                      {formData.description}
                    </p>
                  </div>
                )}

                {errors.general && (
                  <div style={{
                    marginBottom: 20, padding: "12px 16px",
                    background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8,
                    display: "flex", alignItems: "center", gap: 8,
                  }}>
                    <AlertCircle size={16} color="#ef4444" />
                    <span style={{ color: "#ef4444", fontSize: 14 }}>{errors.general}</span>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                  {formData?.questions?.map((q: any, i: number) => (
                    <motion.div key={q.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}>
                      <label style={{ display: "block", marginBottom: 8, fontSize: 14, fontWeight: 500, color: userPreferences?.themeSettings?.text || "#374151" }}>
                        {q.label}{q.required && <span style={{ color: "#ef4444", marginLeft: 4 }}>*</span>}
                      </label>
                      {renderField(q)}
                      {errors[q.id] && (
                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                          style={{ marginTop: 6, color: "#ef4444", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}>
                          <AlertCircle size={12} /> {errors[q.id]}
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </div>

                <motion.button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  whileHover={{ scale: isSubmitting ? 1 : 1.02 }}
                  whileTap={{ scale: isSubmitting ? 1 : 0.98 }}
                  style={{
                    width: "100%", padding: "14px 20px", marginTop: 32,
                    background: isSubmitting ? "#9ca3af" : userPreferences?.colorTheme || "#4285f4",
                    color: "white", border: "none", borderRadius: 8,
                    fontSize: 16, fontWeight: 600, cursor: isSubmitting ? "not-allowed" : "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div style={{
                        width: 16, height: 16,
                        border: "2px solid #ffffff40", borderTop: "2px solid #ffffff",
                        borderRadius: "50%", animation: "spin 1s linear infinite",
                      }} />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Send size={16} /> Submit Form
                    </>
                  )}
                </motion.button>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* ✅ Inline keyframes (no Next.js `style jsx`) */}
      <style>{`
        @keyframes spin { 0% {transform: rotate(0deg);} 100% {transform: rotate(360deg);} }
      `}</style>
    </AnimatePresence>
  );
};

export default FormDialog;
