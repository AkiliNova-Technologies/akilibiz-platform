import {describe,expect,it} from "vitest";
import {apiError,apiSuccess,apiLegacyJson} from "./api-response";

describe("private stable API responses",()=>{
  it("preserves old error messages while adding machine-readable errors",async()=>{
    const response=apiLegacyJson({error:"Draft not found.",reason:"missing"},404);
    expect(response.status).toBe(404);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(await response.json()).toEqual({
      error:"Draft not found.",code:"NOT_FOUND",reason:"missing",
    });
  });
  it("maps expected HTTP failures to their public contract",async()=>{
    const pairs=[
      [400,"VALIDATION_FAILED"],[401,"UNAUTHORIZED"],[403,"FORBIDDEN"],
      [409,"CONFLICT"],[413,"VALIDATION_FAILED"],[422,"VALIDATION_FAILED"],
      [423,"REQUEST_PENDING"],[502,"SYNC_UNAVAILABLE"],[503,"SERVICE_UNAVAILABLE"],
    ] as const;
    for(const [status,code] of pairs){
      const response=apiLegacyJson({error:"Unable to continue."},status);
      expect((await response.json()).code).toBe(code);
    }
  });
  it("does not alter successful legacy JSON or invent a code for nonerrors",async()=>{
    const body={drafts:[],canPost:false};
    const response=apiLegacyJson(body);
    expect(await response.json()).toEqual(body);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("keeps existing canonical error and success response contracts",async()=>{
    expect(await apiError("FORBIDDEN","Not allowed.",403).json()).toEqual({
      error:"Not allowed.",code:"FORBIDDEN",
    });
    expect(await apiSuccess({state:"pending"}).json()).toEqual({state:"pending"});
  });
});
