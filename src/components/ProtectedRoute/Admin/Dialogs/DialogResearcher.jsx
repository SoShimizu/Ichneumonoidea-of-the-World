import React, { useEffect, useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Grid,
  Box, IconButton, Typography, CircularProgress, Alert, Paper,
} from '@mui/material';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import supabase from '../../../../utils/supabase';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import RepositorySelector from './parts/RepositorySelector';

/* ---------------- ORCID helpers ---------------- */

/** ORCIDチェックサム (ISO 7064, Mod 11-2) を検証 */
function isValidOrcidCheckDigit(digits16 /* string(16), last may be X */) {
  if (!/^[0-9]{15}[0-9X]$/i.test(digits16)) return false;
  const chars = digits16.toUpperCase().split('');
  let total = 0;
  for (let i = 0; i < 15; i++) {
    total = (total + parseInt(chars[i], 10)) * 2;
  }
  const remainder = total % 11;
  const result = (12 - remainder) % 11;
  const check = result === 10 ? 'X' : String(result);
  return check === chars[15];
}

/** 任意入力から ORCID を抽出して正規化（例: URL/ID → 0000-0000-0000-0000）。不正なら null */
function toOrcidCanonical(input) {
  if (input == null) return null;
  let s = String(input).trim();
  if (s === '') return null;

  // URL を剥がす
  s = s.replace(/^https?:\/\/(www\.)?orcid\.org\//i, '');
  // 余計な記号を除去（数字とX以外は捨てる）
  s = s.replace(/[^0-9xX]/g, '').toUpperCase();

  if (s.length !== 16) return null;
  if (!isValidOrcidCheckDigit(s)) return null;

  // 0000-0000-0000-0000 形式に整形
  return `${s.slice(0, 4)}-${s.slice(4, 8)}-${s.slice(8, 12)}-${s.slice(12, 16)}`;
}

/* ---------------- Zod schema ---------------- */

// string | null を受けつつ、提出時に正規化。空欄は null、値があるのに不正なときはエラー。
const orcidSchema = z
  .union([z.string(), z.null()]) // 入力は string or null
  .transform((v) => {
    if (v == null) return null;
    const trimmed = String(v).trim();
    if (trimmed === '') return null;
    const canon = toOrcidCanonical(trimmed);
    return canon ?? '__INVALID_ORCID__';
  })
  .refine((v) => v === null || v !== '__INVALID_ORCID__', {
    message: 'Invalid ORCID (must be like 0000-0000-0000-0000 or a valid orcid.org URL)',
  });

const researcherSchema = z.object({
  last_name: z.string().min(1, 'Last name is required'),
  first_name: z.string().min(1, 'First name is required'),
  middle_name: z.string().nullable().optional(),
  name_particle: z.string().nullable().optional(),
  birth_date: z.string().nullable().optional(),
  death_date: z.string().nullable().optional(),
  orcid: orcidSchema.optional(),
  links: z.array(z.object({ key: z.string(), value: z.string() })).optional(),
  aliases: z.array(z.object({ alias_name: z.string().min(1, 'Alias name cannot be empty') })),
  affiliations: z.array(z.object({
    // RepositorySelector が返すオブジェクトをそのまま保持できるように .passthrough()
    repository: z.object({ uuid: z.string() }, { required_error: 'Institution is required.' })
                 .passthrough()
                 .nullable(),
    position: z.string().nullable().optional(),
    start_date: z.string().nullable().optional(),
    end_date: z.string().nullable().optional(),
  })),
});

const DialogResearcher = ({ open, onClose, researcherId }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const { control, handleSubmit, reset, setValue, formState: { errors } } = useForm({
    resolver: zodResolver(researcherSchema),
    defaultValues: {
      last_name: '',
      first_name: '',
      aliases: [],
      affiliations: [],
      links: [],
      orcid: '',
      middle_name: '',
      name_particle: '',
      birth_date: null,
      death_date: null,
    },
  });

  const { fields: aliasFields, append: appendAlias, remove: removeAlias } =
    useFieldArray({ control, name: 'aliases' });
  const { fields: affiliationFields, append: appendAffiliation, remove: removeAffiliation } =
    useFieldArray({ control, name: 'affiliations' });
  const { fields: linkFields, append: appendLink, remove: removeLink } =
    useFieldArray({ control, name: 'links' });

  useEffect(() => {
    const fetchResearcherData = async () => {
      if (!researcherId) {
        reset({
          last_name: '', first_name: '', middle_name: '', name_particle: '',
          birth_date: null, death_date: null, orcid: '',
          aliases: [], affiliations: [], links: []
        });
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('researchers')
          .select(`*, researcher_aliases(*), researcher_affiliations(*, Repositories(*, parent:parent_id(*)))`)
          .eq('id', researcherId)
          .single();

        if (error) throw error;

        const linksData = data.links ? Object.entries(data.links).map(([key, value]) => ({ key, value })) : [];

        reset({
          last_name: data.last_name,
          first_name: data.first_name,
          middle_name: data.middle_name || '',
          name_particle: data.name_particle || '',
          birth_date: data.birth_date,
          death_date: data.death_date,
          orcid: data.orcid || '',
          aliases: data.researcher_aliases || [],
          affiliations: (data.researcher_affiliations || []).map(aff => {
            const repo = aff.Repositories;
            const parentRepo = repo?.parent || repo;
            return {
              repository: repo ? {
                ...repo,
                is_synonym: repo.uuid !== repo.parent_id,
                parent_uuid: parentRepo?.uuid,
                parent_acronym: parentRepo?.acronym,
                parent_name_en: parentRepo?.name_en,
              } : null,
              position: aff.position || '',
              start_date: aff.start_date,
              end_date: aff.end_date,
            };
          }),
          links: linksData,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    fetchResearcherData();
  }, [researcherId, reset]);

  const onSubmit = async (formData) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const linksObject = (formData.links || []).reduce((acc, { key, value }) => {
        if (key && value) acc[key] = value;
        return acc;
      }, {});

      const researcherData = {
        id: researcherId,
        last_name: formData.last_name,
        first_name: formData.first_name,
        middle_name: formData.middle_name || null,
        name_particle: formData.name_particle || null,
        birth_date: formData.birth_date || null,
        death_date: formData.death_date || null,
        orcid: formData.orcid ?? null, // Zodで正規化済み
        links: linksObject,
      };

      const aliasesData = (formData.aliases || []).map(a => ({ alias_name: a.alias_name }));
      const affiliationsData = (formData.affiliations || [])
        .filter(a => a.repository && a.repository.uuid)
        .map(a => ({
          // 保存は親UUIDを優先
          repository_id: a.repository.parent_uuid || a.repository.uuid,
          position: a.position || null,
          start_date: a.start_date || null,
          end_date: a.end_date || null,
        }));

      const { error: rpcError } = await supabase.rpc('upsert_researcher_with_relations', {
        p_researcher_data: researcherData,
        p_aliases_data: aliasesData,
        p_affiliations_data: affiliationsData,
      });

      if (rpcError) throw rpcError;

      setSuccess(`Researcher ${researcherId ? 'updated' : 'created'} successfully!`);
      setTimeout(() => onClose(true), 1200);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={() => onClose(false)} maxWidth="md" fullWidth>
      <DialogTitle>{researcherId ? 'Edit Researcher' : 'Add New Researcher'}</DialogTitle>
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogContent>
          {loading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', my: 2 }}>
              <CircularProgress />
            </Box>
          )}
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Basic Information</Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <Controller
                  name="name_particle"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} value={field.value || ''} label="Particle (van, de)" fullWidth size="small" />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={4}>
                <Controller
                  name="first_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="First Name"
                      required
                      fullWidth
                      size="small"
                      error={!!errors.first_name}
                      helperText={errors.first_name?.message}
                    />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={2}>
                <Controller
                  name="middle_name"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} value={field.value || ''} label="Middle" fullWidth size="small" />
                  )}
                />
              </Grid>
              <Grid item xs={6} sm={3}>
                <Controller
                  name="last_name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Last Name"
                      required
                      fullWidth
                      size="small"
                      error={!!errors.last_name}
                      helperText={errors.last_name?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="birth_date"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ''}
                      label="Birth Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      size="small"
                    />
                  )}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="death_date"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ''}
                      label="Death Date"
                      type="date"
                      InputLabelProps={{ shrink: true }}
                      fullWidth
                      size="small"
                    />
                  )}
                />
              </Grid>

              {/* ORCID: URL/IDどちらでもOK + blurで正規化 + 検証エラー表示 */}
              <Grid item xs={12}>
                <Controller
                  name="orcid"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      value={field.value || ''}
                      label="ORCID"
                      placeholder="e.g., 0000-0002-5202-4552 or https://orcid.org/0000-0002-5202-4552"
                      fullWidth
                      size="small"
                      error={!!errors.orcid}
                      helperText={errors.orcid?.message || 'You can paste the full ORCID URL or just the 16-digit ID.'}
                      onBlur={(e) => {
                        const canon = toOrcidCanonical(e.target.value);
                        // 入力が空 or 不正ならそのまま（検証はZod）。正しいときだけ整形して反映
                        if (canon) {
                          setValue('orcid', canon, { shouldValidate: true });
                        }
                        field.onBlur();
                      }}
                    />
                  )}
                />
              </Grid>
            </Grid>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Aliases</Typography>
            {aliasFields.map((item, index) => (
              <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Controller
                  name={`aliases.${index}.alias_name`}
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Alias Name"
                      fullWidth
                      required
                      size="small"
                      error={!!errors.aliases?.[index]?.alias_name}
                      helperText={errors.aliases?.[index]?.alias_name?.message}
                    />
                  )}
                />
                <IconButton onClick={() => removeAlias(index)} sx={{ ml: 1 }}>
                  <DeleteOutlineIcon />
                </IconButton>
              </Box>
            ))}
            <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={() => appendAlias({ alias_name: '' })}>
              Add Alias
            </Button>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
            <Typography variant="h6" gutterBottom>Links</Typography>
            {linkFields.map((item, index) => (
              <Grid container spacing={1} key={item.id} sx={{ mb: 1, alignItems: 'center' }}>
                <Grid item xs={4}>
                  <Controller
                    name={`links.${index}.key`}
                    control={control}
                    render={({ field }) => <TextField {...field} label="Site (e.g., Google Scholar)" fullWidth size="small" />}
                  />
                </Grid>
                <Grid item xs>
                  <Controller
                    name={`links.${index}.value`}
                    control={control}
                    render={({ field }) => <TextField {...field} label="URL" fullWidth size="small" />}
                  />
                </Grid>
                <Grid item xs="auto">
                  <IconButton onClick={() => removeLink(index)}>
                    <DeleteOutlineIcon />
                  </IconButton>
                </Grid>
              </Grid>
            ))}
            <Button size="small" startIcon={<AddCircleOutlineIcon />} onClick={() => appendLink({ key: '', value: '' })}>
              Add Link
            </Button>
          </Paper>

          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Affiliations</Typography>
            {affiliationFields.map((item, index) => (
              <Paper key={item.id} variant="outlined" sx={{ p: 2, mb: 2, position: 'relative' }}>
                <IconButton onClick={() => removeAffiliation(index)} sx={{ position: 'absolute', top: 4, right: 4, zIndex: 1 }}>
                  <DeleteOutlineIcon />
                </IconButton>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <Controller
                    name={`affiliations.${index}.repository`}
                    control={control}
                    render={({ field, fieldState }) => (
                      <RepositorySelector
                        // ★ オブジェクトをそのまま渡す・受け取る（uuid だけにしない）
                        value={field.value || null}
                        onChange={(newValue) => field.onChange(newValue)}
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                      />
                    )}
                  />
                  <Controller
                    name={`affiliations.${index}.position`}
                    control={control}
                    render={({ field }) => <TextField {...field} value={field.value || ''} label="Position" fullWidth size="small" />}
                  />
                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Controller
                      name={`affiliations.${index}.start_date`}
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} value={field.value || ''} label="Start Date" type="date" InputLabelProps={{ shrink: true }} fullWidth size="small" />
                      )}
                    />
                    <Controller
                      name={`affiliations.${index}.end_date`}
                      control={control}
                      render={({ field }) => (
                        <TextField {...field} value={field.value || ''} label="End Date" type="date" InputLabelProps={{ shrink: true }} fullWidth size="small" />
                      )}
                    />
                  </Box>
                </Box>
              </Paper>
            ))}
            <Button
              size="small"
              startIcon={<AddCircleOutlineIcon />}
              onClick={() => appendAffiliation({ repository: null, position: '', start_date: null, end_date: null })}
            >
              Add Affiliation
            </Button>
          </Paper>
        </DialogContent>

        <DialogActions sx={{ p: '16px 24px' }}>
          <Button onClick={() => onClose(false)}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>Save</Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default DialogResearcher;
