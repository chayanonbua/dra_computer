"use client";

import { useEffect, useRef, useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Modal } from "@/components/Modal";
import type { MovementDestinationOption } from "@/lib/organization";
import {
  createMovementAction,
  createRepairAction,
  disposeAssetAction,
  type ActionState,
} from "./actions";

const initialState: ActionState = { success: false, error: null };

function todayInputValue(): string {
  return new Date().toISOString().slice(0, 10);
}

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
    >
      {pending ? "กำลังบันทึก..." : label}
    </button>
  );
}

function RepairForm({ assetId, onClose }: { assetId: number; onClose: () => void }) {
  const action = createRepairAction.bind(null, assetId);
  const [state, formAction] = useFormState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium">วันที่</label>
        <input
          type="date"
          name="repairedAt"
          required
          defaultValue={todayInputValue()}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">อาการ</label>
        <input
          type="text"
          name="symptom"
          required
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">การแก้ไข</label>
        <input
          type="text"
          name="solution"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">ค่าใช้จ่าย (บาท)</label>
        <input
          type="number"
          name="cost"
          min="0"
          step="0.01"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">ผู้ดำเนินการ</label>
        <input
          type="text"
          name="handledBy"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-gray-300 px-4 py-2 text-sm"
        >
          ยกเลิก
        </button>
        <SubmitButton label="บันทึกการซ่อม" />
      </div>
    </form>
  );
}

function MovementForm({
  assetId,
  currentOwnerName,
  destinations,
  onClose,
}: {
  assetId: number;
  currentOwnerName: string | null;
  destinations: MovementDestinationOption[];
  onClose: () => void;
}) {
  const groupDestinations = destinations.filter((d) => d.type === "group");
  const personDestinations = destinations.filter((d) => d.type === "person");
  const action = createMovementAction.bind(null, assetId);
  const [state, formAction] = useFormState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <div>
        <label className="mb-1 block text-sm font-medium">ต้นทาง</label>
        <p className="rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-600">
          {currentOwnerName ?? "(ยังไม่มีผู้ใช้งาน)"}
        </p>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">วันที่</label>
        <input
          type="date"
          name="movedAt"
          required
          defaultValue={todayInputValue()}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">ปลายทาง</label>
        <select
          name="destination"
          required
          defaultValue=""
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="" disabled>
            เลือกผู้ใช้งาน/กลุ่มปลายทาง
          </option>
          {groupDestinations.length > 0 && (
            <optgroup label="กลุ่ม">
              {groupDestinations.map((d) => (
                <option key={`group-${d.id}`} value={`group:${d.id}`}>
                  {d.name} ({d.contextLabel})
                </option>
              ))}
            </optgroup>
          )}
          {personDestinations.length > 0 && (
            <optgroup label="บุคคล">
              {personDestinations.map((d) => (
                <option key={`person-${d.id}`} value={`person:${d.id}`}>
                  {d.name} ({d.contextLabel})
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">หมายเหตุ</label>
        <input
          type="text"
          name="note"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-gray-300 px-4 py-2 text-sm"
        >
          ยกเลิก
        </button>
        <SubmitButton label="บันทึกการเคลื่อนย้าย" />
      </div>
    </form>
  );
}

function DisposalForm({ assetId, onClose }: { assetId: number; onClose: () => void }) {
  const action = disposeAssetAction.bind(null, assetId);
  const [state, formAction] = useFormState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      onClose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.success]);

  return (
    <form ref={formRef} action={formAction} className="flex flex-col gap-3">
      <p className="text-sm text-gray-600">
        การจำหน่ายจะเปลี่ยนสถานะครุภัณฑ์เป็น &ldquo;จำหน่าย&rdquo; และจะไม่สามารถบันทึกการซ่อมหรือการเคลื่อนย้ายได้อีก
      </p>
      <div>
        <label className="mb-1 block text-sm font-medium">วันที่จำหน่าย</label>
        <input
          type="date"
          name="disposedAt"
          required
          defaultValue={todayInputValue()}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium">เหตุผล</label>
        <input
          type="text"
          name="reason"
          required
          placeholder="เช่น เสื่อมสภาพ, ชำรุด, ครบอายุการใช้งาน"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="mt-2 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded border border-gray-300 px-4 py-2 text-sm"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
        >
          ยืนยันจำหน่าย
        </button>
      </div>
    </form>
  );
}

export function AssetActions({
  assetId,
  status,
  currentOwnerName,
  destinations,
}: {
  assetId: number;
  status: string;
  currentOwnerName: string | null;
  destinations: MovementDestinationOption[];
}) {
  const [openModal, setOpenModal] = useState<"repair" | "movement" | "disposal" | null>(
    null
  );
  const isDisposed = status === "disposed";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <button
        type="button"
        disabled={isDisposed}
        onClick={() => setOpenModal("repair")}
        title={isDisposed ? "ครุภัณฑ์นี้ถูกจำหน่ายแล้ว" : undefined}
        className="rounded border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
      >
        บันทึกการซ่อม
      </button>
      <button
        type="button"
        disabled={isDisposed}
        onClick={() => setOpenModal("movement")}
        title={isDisposed ? "ครุภัณฑ์นี้ถูกจำหน่ายแล้ว" : undefined}
        className="rounded border border-blue-600 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 disabled:cursor-not-allowed disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent"
      >
        บันทึกการเคลื่อนย้าย
      </button>
      {!isDisposed && (
        <button
          type="button"
          onClick={() => setOpenModal("disposal")}
          className="rounded border border-red-600 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
        >
          จำหน่าย
        </button>
      )}
      {isDisposed && (
        <span className="text-sm text-gray-400">ครุภัณฑ์นี้ถูกจำหน่ายแล้ว</span>
      )}

      {openModal === "repair" && (
        <Modal title="บันทึกการซ่อม" onClose={() => setOpenModal(null)}>
          <RepairForm assetId={assetId} onClose={() => setOpenModal(null)} />
        </Modal>
      )}

      {openModal === "movement" && (
        <Modal title="บันทึกการเคลื่อนย้าย" onClose={() => setOpenModal(null)}>
          <MovementForm
            assetId={assetId}
            currentOwnerName={currentOwnerName}
            destinations={destinations}
            onClose={() => setOpenModal(null)}
          />
        </Modal>
      )}

      {openModal === "disposal" && (
        <Modal title="จำหน่ายครุภัณฑ์" onClose={() => setOpenModal(null)}>
          <DisposalForm assetId={assetId} onClose={() => setOpenModal(null)} />
        </Modal>
      )}
    </div>
  );
}
