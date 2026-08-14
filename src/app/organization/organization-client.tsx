"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { Modal } from "@/components/Modal";
import type { OfficeNode, OfficeSummary, GroupSummary } from "@/lib/organization";
import { filterOrganizationTree } from "@/lib/organization-filter";
import {
  createOfficeAction,
  updateOfficeAction,
  deleteOfficeAction,
  createGroupAction,
  updateGroupAction,
  deleteGroupAction,
  createPersonAction,
  updatePersonAction,
  deletePersonAction,
  type ActionState,
} from "./actions";

const initialState: ActionState = { success: false, error: null };

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

function NameForm({
  title,
  initialName,
  action,
  onClose,
  children,
}: {
  title: string;
  initialName: string;
  action: (prevState: ActionState, formData: FormData) => Promise<ActionState>;
  onClose: () => void;
  children?: React.ReactNode;
}) {
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
    <Modal title={title} onClose={onClose}>
      <form ref={formRef} action={formAction} className="flex flex-col gap-3">
        <div>
          <label className="mb-1 block text-sm font-medium">ชื่อ</label>
          <input
            type="text"
            name="name"
            required
            defaultValue={initialName}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        {children}

        {state.error && <p className="text-sm text-red-600">{state.error}</p>}

        <div className="mt-2 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded border border-gray-300 px-4 py-2 text-sm"
          >
            ยกเลิก
          </button>
          <SubmitButton label="บันทึก" />
        </div>
      </form>
    </Modal>
  );
}

function DeleteButton({
  onDelete,
  confirmMessage,
}: {
  onDelete: () => Promise<ActionState>;
  confirmMessage: string;
}) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    if (!window.confirm(confirmMessage)) return;
    setError(null);
    startTransition(async () => {
      const result = await onDelete();
      if (!result.success) setError(result.error);
    });
  };

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="text-xs text-red-600 hover:underline disabled:opacity-50"
      >
        ลบ
      </button>
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

type ModalState =
  | { kind: "office-create" }
  | { kind: "office-edit"; office: { id: number; name: string } }
  | { kind: "group-create"; officeId: number }
  | { kind: "group-edit"; group: { id: number; name: string; officeId: number } }
  | { kind: "person-create"; groupId: number }
  | { kind: "person-edit"; person: { id: number; name: string; groupId: number } }
  | null;

export function OrganizationClient({
  tree,
  offices,
  groups,
}: {
  tree: OfficeNode[];
  offices: OfficeSummary[];
  groups: GroupSummary[];
}) {
  const [modal, setModal] = useState<ModalState>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [officeFilter, setOfficeFilter] = useState<string>("");
  const [expandedOffices, setExpandedOffices] = useState<Set<number>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<number>>(new Set());

  const isSearching = searchTerm.trim() !== "";

  const filteredTree = useMemo(
    () =>
      filterOrganizationTree(
        tree,
        searchTerm,
        officeFilter === "" ? null : Number(officeFilter)
      ),
    [tree, searchTerm, officeFilter]
  );

  function toggleOffice(id: number, open: boolean) {
    setExpandedOffices((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleGroup(id: number, open: boolean) {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function expandAll() {
    setExpandedOffices(new Set(tree.map((o) => o.id)));
    setExpandedGroups(new Set(tree.flatMap((o) => o.groups.map((g) => g.id))));
  }

  function collapseAll() {
    setExpandedOffices(new Set());
    setExpandedGroups(new Set());
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setModal({ kind: "office-create" })}
          className="w-fit rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          เพิ่มสำนัก
        </button>
        <button
          type="button"
          onClick={expandAll}
          className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          ขยายทั้งหมด
        </button>
        <button
          type="button"
          onClick={collapseAll}
          className="rounded border border-gray-300 px-3 py-2 text-sm hover:bg-gray-50"
        >
          ยุบทั้งหมด
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-sm font-medium">ค้นหา</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="พิมพ์ชื่อบุคคล กลุ่ม หรือสำนัก..."
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          />
        </div>
        <div className="min-w-[200px]">
          <label className="mb-1 block text-sm font-medium">กรองตามสำนัก</label>
          <select
            value={officeFilter}
            onChange={(e) => setOfficeFilter(e.target.value)}
            className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          >
            <option value="">ทุกสำนัก</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tree.length === 0 && (
        <p className="text-sm text-gray-400">ยังไม่มีสำนักในระบบ</p>
      )}

      {tree.length > 0 && filteredTree.length === 0 && (
        <p className="text-sm text-gray-400">ไม่พบรายการที่ตรงกับการค้นหา/ฟิลเตอร์</p>
      )}

      <div className="flex flex-col gap-3">
        {filteredTree.map((office) => {
          const officeOpen = isSearching || expandedOffices.has(office.id);
          return (
            <details
              key={office.id}
              open={officeOpen}
              onToggle={(e) => toggleOffice(office.id, e.currentTarget.open)}
              className="rounded border border-gray-200 p-4"
            >
              <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                <span className="font-semibold">
                  {office.name}{" "}
                  <span className="font-normal text-gray-400">
                    ({office.groups.length} กลุ่ม)
                  </span>
                </span>
                <span className="flex items-center gap-3" onClick={(e) => e.preventDefault()}>
                  <button
                    type="button"
                    onClick={() => setModal({ kind: "office-edit", office })}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    แก้ไข
                  </button>
                  <DeleteButton
                    confirmMessage={`ยืนยันลบสำนัก "${office.name}" ?`}
                    onDelete={() => deleteOfficeAction(office.id)}
                  />
                  <button
                    type="button"
                    onClick={() => setModal({ kind: "group-create", officeId: office.id })}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    + เพิ่มกลุ่ม
                  </button>
                </span>
              </summary>

              <div className="mt-3 flex flex-col gap-3 border-l-2 border-gray-100 pl-4">
                {office.groups.length === 0 && (
                  <p className="text-sm text-gray-400">ยังไม่มีกลุ่มในสำนักนี้</p>
                )}

                {office.groups.map((group) => {
                  const groupOpen = isSearching || expandedGroups.has(group.id);
                  return (
                    <details
                      key={group.id}
                      open={groupOpen}
                      onToggle={(e) => toggleGroup(group.id, e.currentTarget.open)}
                      className="rounded border border-gray-200 p-3"
                    >
                      <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                        <span className="font-medium">
                          {group.name}{" "}
                          <span className="font-normal text-gray-400">
                            ({group.people.length} คน)
                          </span>
                        </span>
                        <span className="flex items-center gap-3" onClick={(e) => e.preventDefault()}>
                          <button
                            type="button"
                            onClick={() =>
                              setModal({
                                kind: "group-edit",
                                group: { id: group.id, name: group.name, officeId: office.id },
                              })
                            }
                            className="text-xs text-blue-600 hover:underline"
                          >
                            แก้ไข
                          </button>
                          <DeleteButton
                            confirmMessage={`ยืนยันลบกลุ่ม "${group.name}" ?`}
                            onDelete={() => deleteGroupAction(group.id)}
                          />
                          <button
                            type="button"
                            onClick={() => setModal({ kind: "person-create", groupId: group.id })}
                            className="text-xs text-blue-600 hover:underline"
                          >
                            + เพิ่มบุคคล
                          </button>
                        </span>
                      </summary>

                      <ul className="mt-2 flex flex-col gap-1 border-l-2 border-gray-100 pl-4">
                        {group.people.length === 0 && (
                          <li className="text-sm text-gray-400">ยังไม่มีบุคคลในกลุ่มนี้</li>
                        )}
                        {group.people.map((person) => (
                          <li
                            key={person.id}
                            className="flex flex-wrap items-center justify-between gap-2 text-sm"
                          >
                            <span>{person.name}</span>
                            <span className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() =>
                                  setModal({
                                    kind: "person-edit",
                                    person: { id: person.id, name: person.name, groupId: group.id },
                                  })
                                }
                                className="text-xs text-blue-600 hover:underline"
                              >
                                แก้ไข
                              </button>
                              <DeleteButton
                                confirmMessage={`ยืนยันลบ "${person.name}" ?`}
                                onDelete={() => deletePersonAction(person.id)}
                              />
                            </span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  );
                })}
              </div>
            </details>
          );
        })}
      </div>

      {modal?.kind === "office-create" && (
        <NameForm
          title="เพิ่มสำนัก"
          initialName=""
          action={createOfficeAction}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.kind === "office-edit" && (
        <NameForm
          title="แก้ไขสำนัก"
          initialName={modal.office.name}
          action={updateOfficeAction.bind(null, modal.office.id)}
          onClose={() => setModal(null)}
        />
      )}

      {modal?.kind === "group-create" && (
        <NameForm
          title="เพิ่มกลุ่ม"
          initialName=""
          action={createGroupAction}
          onClose={() => setModal(null)}
        >
          <div>
            <label className="mb-1 block text-sm font-medium">สังกัดสำนัก</label>
            <select
              name="officeId"
              required
              defaultValue={modal.officeId}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </NameForm>
      )}

      {modal?.kind === "group-edit" && (
        <NameForm
          title="แก้ไขกลุ่ม"
          initialName={modal.group.name}
          action={updateGroupAction.bind(null, modal.group.id)}
          onClose={() => setModal(null)}
        >
          <div>
            <label className="mb-1 block text-sm font-medium">สังกัดสำนัก</label>
            <select
              name="officeId"
              required
              defaultValue={modal.group.officeId}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              {offices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        </NameForm>
      )}

      {modal?.kind === "person-create" && (
        <NameForm
          title="เพิ่มบุคคล"
          initialName=""
          action={createPersonAction}
          onClose={() => setModal(null)}
        >
          <div>
            <label className="mb-1 block text-sm font-medium">สังกัดกลุ่ม</label>
            <select
              name="groupId"
              required
              defaultValue={modal.groupId}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.officeName})
                </option>
              ))}
            </select>
          </div>
        </NameForm>
      )}

      {modal?.kind === "person-edit" && (
        <NameForm
          title="แก้ไขบุคคล"
          initialName={modal.person.name}
          action={updatePersonAction.bind(null, modal.person.id)}
          onClose={() => setModal(null)}
        >
          <div>
            <label className="mb-1 block text-sm font-medium">สังกัดกลุ่ม</label>
            <select
              name="groupId"
              required
              defaultValue={modal.person.groupId}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
            >
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.officeName})
                </option>
              ))}
            </select>
          </div>
        </NameForm>
      )}
    </div>
  );
}
