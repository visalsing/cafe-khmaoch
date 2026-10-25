
import React, { useEffect, useState } from "react";
import {
  UserRound,
  Mail,
  Phone,
  MapPin,
  Camera,
  ShieldCheck,
  CalendarDays,
  Clock,
  BriefcaseBusiness,
  Globe,
  VenusAndMars,
  BadgeCheck,
  AlertCircle,
  Save,
  RotateCcw,
} from "lucide-react";

import { useAuth } from "../../context/AuthContext.jsx";
import { assetUrl } from "../../services/api.js";

const EMPTY_FORM = {
  firstName: "",
  lastName: "",
  firstNameNative: "",
  lastNameNative: "",
  email: "",
  phone: "",
  genderId: "",
  nationalityId: "",
  positionId: "",
  address: "",
  region: "",
  country: "",
  description: "",
};

const INPUT_CLASS =
  "mt-1.5 w-full min-w-0 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100";

function formatDate(value) {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ProfileField({
  label,
  name,
  value,
  onChange,
  icon: Icon,
  type = "text",
  readOnly = false,
}) {
  return (
    <label className="block min-w-0">
      <span className="text-sm font-medium text-gray-700">
        {label}
      </span>

      <div className="relative">
        {Icon && (
          <Icon
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        )}

        <input
          type={type}
          name={name}
          value={value ?? ""}
          onChange={onChange}
          readOnly={readOnly}
          className={`${INPUT_CLASS} ${
            Icon ? "pl-10" : ""
          } ${
            readOnly
              ? "cursor-not-allowed bg-gray-50 text-gray-500"
              : ""
          }`}
        />
      </div>
    </label>
  );
}

function InfoItem({ icon: Icon, label, value }) {
  return (
    <div className="flex min-w-0 items-start gap-3">
      <div className="rounded-lg bg-gray-100 p-2 text-gray-500">
        <Icon size={17} />
      </div>

      <div className="min-w-0">
        <p className="text-xs text-gray-500">{label}</p>
        <p className="mt-1 break-words text-sm font-medium text-gray-800">
          {value || "Not provided"}
        </p>
      </div>
    </div>
  );
}

export default function Profile() {
  const { currentUser, loading, refresh } = useAuth();

  const [form, setForm] = useState(EMPTY_FORM);
  const [avatarFile, setAvatarFile] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState("");
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("info");

  useEffect(() => {
    if (!currentUser) return;

    setForm({
      firstName: currentUser.firstName ?? "",
      lastName: currentUser.lastName ?? "",
      firstNameNative: currentUser.firstNameNative ?? "",
      lastNameNative: currentUser.lastNameNative ?? "",
      email: currentUser.email ?? "",
      phone: currentUser.phone ?? "",
      genderId: currentUser.genderId ?? currentUser.gender_id ?? "",
      nationalityId:
        currentUser.nationalityId ??
        currentUser.nationality_id ??
        "",
      positionId:
        currentUser.positionId ??
        currentUser.position_id ??
        "",
      address: currentUser.address ?? "",
      region: currentUser.region ?? "",
      country: currentUser.country ?? "",
      description: currentUser.description ?? "",
    });

    setAvatarFile(null);
    setAvatarPreview(
      currentUser.avatar ? assetUrl(currentUser.avatar) : ""
    );
  }, [currentUser]);

  useEffect(() => {
    if (!avatarFile) return;

    const objectUrl = URL.createObjectURL(avatarFile);
    setAvatarPreview(objectUrl);

    return () => URL.revokeObjectURL(objectUrl);
  }, [avatarFile]);

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    setMessage("");
  }

  function handleAvatarChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please select a valid image.");
      setMessageType("error");
      event.target.value = "";
      return;
    }

    setAvatarFile(file);
    setMessage("");
  }

  function handleCancel() {
    if (currentUser) {
      setForm({
        ...EMPTY_FORM,
        ...Object.fromEntries(
          Object.keys(EMPTY_FORM).map((key) => [
            key,
            currentUser[key] ??
              currentUser[
                key.replace(/[A-Z]/g, (letter) =>
                  `_${letter.toLowerCase()}`
                )
              ] ??
              "",
          ])
        ),
      });

      setAvatarPreview(
        currentUser.avatar ? assetUrl(currentUser.avatar) : ""
      );
    }

    setAvatarFile(null);
    setEditing(false);
    setMessage("");
  }

  async function handleSubmit(event) {
    event.preventDefault();

    // Do not claim that changes have been saved when there is
    // no confirmed self-profile update endpoint yet.
    setMessage(
      "Editing is available, but saving is not connected yet. We need to reuse your existing user-update API safely."
    );
    setMessageType("info");
  }

  if (loading) {
    return (
      <div className="flex min-h-64 items-center justify-center text-sm text-gray-500">
        Loading your profile...
      </div>
    );
  }

  if (!currentUser) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <div className="rounded-xl border border-gray-200 bg-white p-6">
          <UserRound className="mb-3 text-gray-400" size={30} />
          <h1 className="text-xl font-semibold text-gray-900">
            My Profile
          </h1>
          <p className="mt-2 text-sm text-gray-500">
            Please log in to view your account information.
          </p>
        </div>
      </main>
    );
  }

  const fullName =
    [currentUser.firstName, currentUser.lastName]
      .filter(Boolean)
      .join(" ") || currentUser.email || "My Account";

  const role =
    currentUser.roleName ??
    currentUser.role_name ??
    currentUser.role_code ??
    currentUser.role ??
    "User";

  const isEmailVerified = Boolean(
    currentUser.isVerifiedEmail ??
      currentUser.is_verified_email ??
      currentUser.emailVerifiedAt ??
      currentUser.email_verified_at
  );

  const createdAt =
    currentUser.createdAt ?? currentUser.created_at;

  const lastLogin =
    currentUser.lastLoginAt ?? currentUser.last_login_at;

  return (
    <main className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            My Profile
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            View and manage your personal account information.
          </p>
        </div>

        {!editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(true);
              setMessage("");
            }}
            className="rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-700"
          >
            Edit profile
          </button>
        )}
      </header>

      {message && (
        <div
          className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
            messageType === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-amber-200 bg-amber-50 text-amber-800"
          }`}
        >
          {messageType === "error" ? (
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
          ) : (
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
          )}
          <p>{message}</p>
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="h-24 bg-gradient-to-r from-amber-100 via-orange-50 to-gray-100 sm:h-32" />

        <div className="px-5 pb-6 sm:px-7">
          <div className="-mt-12 flex flex-wrap items-end gap-4">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-2xl border-4 border-white bg-gray-100 shadow-sm">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt={`${fullName}'s profile`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <UserRound size={42} className="text-gray-400" />
              )}
            </div>

            <div className="min-w-0 flex-1 pb-1">
              <h2 className="break-words text-xl font-bold text-gray-900">
                {fullName}
              </h2>
              <p className="mt-1 break-all text-sm text-gray-500">
                {currentUser.email}
              </p>
            </div>

            <span className="mb-1 inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1.5 text-xs font-medium capitalize text-gray-700">
              <ShieldCheck size={15} />
              {role}
            </span>
          </div>

          {editing && (
            <div className="mt-5">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                <Camera size={16} />
                Choose profile photo
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleAvatarChange}
                />
              </label>

              {avatarFile && (
                <p className="mt-2 text-xs text-gray-500">
                  Selected: {avatarFile.name}
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {!editing ? (
        <>
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-gray-900">
                Personal information
              </h2>

              <span className="text-xs text-gray-400">
                Your account
              </span>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <InfoItem
                icon={UserRound}
                label="First name"
                value={currentUser.firstName}
              />
              <InfoItem
                icon={UserRound}
                label="Last name"
                value={currentUser.lastName}
              />
              <InfoItem
                icon={UserRound}
                label="Native first name"
                value={currentUser.firstNameNative}
              />
              <InfoItem
                icon={UserRound}
                label="Native last name"
                value={currentUser.lastNameNative}
              />
              <InfoItem
                icon={Mail}
                label="Email address"
                value={currentUser.email}
              />
              <InfoItem
                icon={Phone}
                label="Phone number"
                value={currentUser.phone}
              />
              <InfoItem
                icon={VenusAndMars}
                label="Gender"
                value={currentUser.genderName ?? currentUser.gender_name}
              />
              <InfoItem
                icon={Globe}
                label="Nationality"
                value={
                  currentUser.nationalityName ??
                  currentUser.nationality_name
                }
              />
              <InfoItem
                icon={BriefcaseBusiness}
                label="Position"
                value={
                  currentUser.positionName ??
                  currentUser.position_name
                }
              />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              Address and description
            </h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InfoItem
                icon={MapPin}
                label="Address"
                value={currentUser.address}
              />
              <InfoItem
                icon={MapPin}
                label="Region / Province"
                value={currentUser.region}
              />
              <InfoItem
                icon={Globe}
                label="Country"
                value={currentUser.country}
              />
            </div>

            <div className="mt-6 border-t border-gray-100 pt-5">
              <p className="text-xs text-gray-500">Description</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-gray-700">
                {currentUser.description || "No description provided."}
              </p>
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="mb-5 text-lg font-semibold text-gray-900">
              Account information
            </h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex items-start gap-3">
                {isEmailVerified ? (
                  <BadgeCheck
                    size={20}
                    className="text-green-600"
                  />
                ) : (
                  <AlertCircle
                    size={20}
                    className="text-amber-600"
                  />
                )}

                <div>
                  <p className="text-xs text-gray-500">
                    Email verification
                  </p>
                  <p
                    className={`mt-1 text-sm font-medium ${
                      isEmailVerified
                        ? "text-green-700"
                        : "text-amber-700"
                    }`}
                  >
                    {isEmailVerified ? "Verified" : "Not verified"}
                  </p>
                </div>
              </div>

              <InfoItem
                icon={CalendarDays}
                label="Account created"
                value={formatDate(createdAt)}
              />

              <InfoItem
                icon={Clock}
                label="Last login"
                value={formatDate(lastLogin)}
              />
            </div>
          </section>
        </>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-semibold text-gray-900">
              Personal information
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ProfileField
                label="First name"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
              />
              <ProfileField
                label="Last name"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
              />
              <ProfileField
                label="Native first name"
                name="firstNameNative"
                value={form.firstNameNative}
                onChange={handleChange}
              />
              <ProfileField
                label="Native last name"
                name="lastNameNative"
                value={form.lastNameNative}
                onChange={handleChange}
              />
              <ProfileField
                label="Email address"
                name="email"
                type="email"
                icon={Mail}
                value={form.email}
                onChange={handleChange}
              />
              <ProfileField
                label="Phone number"
                name="phone"
                icon={Phone}
                value={form.phone}
                onChange={handleChange}
              />
            </div>
          </section>

          <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm sm:p-7">
            <h2 className="text-lg font-semibold text-gray-900">
              Address and description
            </h2>

            <div className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2">
              <ProfileField
                label="Address"
                name="address"
                icon={MapPin}
                value={form.address}
                onChange={handleChange}
              />
              <ProfileField
                label="Region / Province"
                name="region"
                value={form.region}
                onChange={handleChange}
              />
              <ProfileField
                label="Country"
                name="country"
                value={form.country}
                onChange={handleChange}
              />
            </div>

            <label className="mt-5 block">
              <span className="text-sm font-medium text-gray-700">
                Description
              </span>
              <textarea
                name="description"
                rows={4}
                value={form.description}
                onChange={handleChange}
                className={INPUT_CLASS}
              />
            </label>
          </section>

          <div className="flex flex-wrap justify-end gap-3">
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <RotateCcw size={16} />
              Cancel
            </button>

            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-amber-700"
            >
              <Save size={16} />
              Save changes
            </button>
          </div>
        </form>
      )}
    </main>
  );
}
